import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { z } from 'zod';
import Header from '../components/Header';
import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import { Keypair, Transaction, PublicKey, Connection } from '@solana/web3.js';
import { useUnifiedWalletContext, useWallet } from '@jup-ag/wallet-adapter';
import { toast } from 'sonner';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const MOGY_MINT = new PublicKey('njKnom8XKGy4hUqJeT4rABeFWGyTJWWSGTEf7Z1mogy');
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const CONNECTION = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const poolSchema = z.object({
  tokenName: z.string().min(3, 'Token name must be at least 3 characters'),
  tokenSymbol: z.string().min(1, 'Token symbol is required').max(10),
  tokenLogo: z.instanceof(File, { message: 'Token logo is required' }).optional(),
  description: z.string().optional().or(z.literal('')),
  website: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
  twitter: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
  telegram: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
  discord: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
  devBuyAmountSol: z.number().min(0.001).max(50).optional(),
});

interface FormValues {
  tokenName: string;
  tokenSymbol: string;
  tokenLogo: File | undefined;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  devBuyAmountSol?: number;
}

export default function CreatePool() {
  const { publicKey, signTransaction } = useWallet();
  const { setShowModal } = useUnifiedWalletContext();
  const address = useMemo(() => publicKey?.toBase58(), [publicKey]);
  const [isLoading, setIsLoading] = useState(false);
  const [poolCreated, setPoolCreated] = useState(false);

  const form = useForm({
    defaultValues: {
      tokenName: '',
      tokenSymbol: '',
      tokenLogo: undefined,
      description: '',
      website: '',
      twitter: '',
      telegram: '',
      discord: '',
      devBuyAmountSol: 0,
    } as FormValues,
    onSubmit: async ({ value }) => {
      try {
        setIsLoading(true);
        const { tokenLogo, devBuyAmountSol = 0 } = value;
        if (!tokenLogo) {
          toast.error('Token logo is required');
          return;
        }
        if (!signTransaction) {
          toast.error('Wallet not connected');
          return;
        }
        // Dev Buy: Automatischer Swap SOL → $MOGY
        if (devBuyAmountSol > 0 && publicKey) {
          toast.info(`Swapping ${devBuyAmountSol} SOL to $MOGY for Dev Buy...`);

          const amountLamports = Math.round(devBuyAmountSol * 1_000_000_000);
          const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${SOL_MINT.toBase58()}&outputMint=${MOGY_MINT.toBase58()}&amount=${amountLamports}&slippageBps=50`;
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(quoteUrl)}`;

          const quoteResponse = await fetch(proxyUrl, { mode: 'cors' });
          const quoteData = await quoteResponse.json();

          if (!quoteResponse.ok || quoteData.error) {
            toast.error('Preisabfrage fehlgeschlagen. Versuche später oder direkt auf Jupiter.');
            return;
          }

          const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quoteResponse: quoteData,
              userPublicKey: publicKey.toString(),
              wrapAndUnwrapSol: true,
            }),
          });

          const swapData = await swapResponse.json();

          if (swapData.error) {
            toast.error('Auto-Swap fehlgeschlagen: ' + (swapData.error || 'Unbekannter Fehler'));
            return;
          }

          const transaction = Transaction.from(Buffer.from(swapData.swapTransaction, 'base64'));
          const signedTransaction = await signTransaction(transaction);
          const rawTx = signedTransaction.serialize();

          const txid = await CONNECTION.sendRawTransaction(rawTx);
          await CONNECTION.confirmTransaction(txid);
          toast.success('Auto-Swap erfolgreich! $MOGY für Dev Buy erhalten.');
        }

        // Pool erstellen (Rest wie bisher)
        const reader = new FileReader();
        const base64File = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(tokenLogo);
        });

        const keyPair = Keypair.generate();

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenLogo: base64File,
            mint: keyPair.publicKey.toBase58(),
            tokenName: value.tokenName,
            tokenSymbol: value.tokenSymbol,
            description: value.description || '',
            website: value.website,
            twitter: value.twitter,
            telegram: value.telegram,
            discord: value.discord,
            devBuyAmountSol: value.devBuyAmountSol || 0,
            userWallet: address,
          }),
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error);
        }

        const { poolTx } = await uploadResponse.json();
        const transaction = Transaction.from(Buffer.from(poolTx, 'base64'));
        transaction.sign(keyPair);
        const signedTransaction = await signTransaction(transaction);

        const sendResponse = await fetch('/api/send-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signedTransaction: signedTransaction.serialize().toString('base64'),
          }),
        });

        if (!sendResponse.ok) {
          const error = await sendResponse.json();
          throw new Error(error.error);
        }

        const { success } = await sendResponse.json();
        if (success) {
          toast.success('Pool created successfully');
          setPoolCreated(true);
        }
      } catch (error) {
        console.error('Error creating pool:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to create pool');
      } finally {
        setIsLoading(false);
      }
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = poolSchema.safeParse(value);
        if (!result.success) {
          return result.error.formErrors.fieldErrors;
        }
        return undefined;
      },
    },
  });

  return (
    <>
      <Head>
        <title>Create Pool - $Mogy Mogverse</title>
        <meta name="description" content="Launch your token into the Mogverse" />
      </Head>

      <div className="min-h-screen bg-black text-white">
        <Header />

        <div className="container mx-auto px-6 mt-6 mb-8">
          <Link href="/" className="inline-flex items-center gap-3 text-cyan-400 hover:text-cyan-300 transition text-lg font-medium">
            <span className="iconify w-6 h-6 ph--arrow-left-bold" />
            Back to Home
          </Link>
        </div>

        <main className="container mx-auto px-6 py-12 max-w-5xl">
          <div className="mb-12 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 mb-4">
              Create Pool
            </h1>
            <p className="text-xl text-gray-300">
              Launch your token into the Mogverse
            </p>
          </div>

          {poolCreated && !isLoading ? (
            <PoolCreationSuccess />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-10"
            >
              {/* Token Details */}
              <div className="bg-gray-900/50 backdrop-blur-md border border-cyan-900/30 rounded-2xl p-8 shadow-2xl">
                <h2 className="text-3xl font-bold text-cyan-400 mb-8">Token Details</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-lg font-medium text-cyan-300 mb-2">
                        Token Name*
                      </label>
                      {form.Field({
                        name: 'tokenName',
                        children: (field) => (
                          <input
                            type="text"
                            className="w-full px-5 py-4 bg-gray-800/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition"
                            placeholder="e.g. Mogy Coin"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            required
                            minLength={3}
                          />
                        ),
                      })}
                    </div>
                    <div>
                      <label className="block text-lg font-medium text-cyan-300 mb-2">
                        Token Symbol*
                      </label>
                      {form.Field({
                        name: 'tokenSymbol',
                        children: (field) => (
                          <input
                            type="text"
                            className="w-full px-5 py-4 bg-gray-800/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition"
                            placeholder="e.g. MOGY"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            required
                            maxLength={10}
                          />
                        ),
                      })}
                    </div>
                  </div>
                  {/* Token Logo mit Vorschau */}
                  <div>
                    <label className="block text-lg font-medium text-cyan-300 mb-3">
                      Token Logo*
                    </label>
                    {form.Field({
                      name: 'tokenLogo',
                      children: (field) => {
                        const previewUrl = field.state.value ? URL.createObjectURL(field.state.value) : null;
                        return (
                          <div className="border-2 border-dashed border-cyan-700/50 rounded-2xl p-10 text-center hover:border-cyan-500 transition">
                            {previewUrl ? (
                              <div className="mb-6">
                                <img
                                  src={previewUrl}
                                  alt="Token logo preview"
                                  className="mx-auto max-h-64 rounded-xl shadow-2xl border border-cyan-600/50"
                                />
                                <p className="text-green-400 mt-4 text-lg font-medium">✓ Logo selected</p>
                              </div>
                            ) : (
                              <>
                                <span className="iconify w-12 h-12 mx-auto mb-4 text-cyan-400 ph--upload-bold" />
                                <p className="text-gray-400 mb-2">PNG, JPG or SVG (max. 2MB)</p>
                              </>
                            )}
                            <input
                              type="file"
                              id="tokenLogo"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 2 * 1024 * 1024) {
                                    toast.error('Image must be smaller than 2MB');
                                    return;
                                  }
                                  field.handleChange(file);
                                }
                              }}
                            />
                            <label
                              htmlFor="tokenLogo"
                              className="inline-block bg-cyan-600/20 hover:bg-cyan-600/30 px-8 py-4 rounded-xl text-cyan-300 font-medium cursor-pointer transition"
                            >
                              {previewUrl ? 'Change Image' : 'Browse Files'}
                            </label>
                          </div>
                        );
                      },
                    })}
                  </div>
                </div>
              </div>
              {/* Token Description (Optional) */}
              <div className="bg-gray-900/50 backdrop-blur-md border border-cyan-900/30 rounded-2xl p-8 shadow-2xl">
                <h2 className="text-3xl font-bold text-cyan-400 mb-8">Token Description (Optional)</h2>
                <p className="text-gray-300 mb-6">
                  Tell the community about your token – helps build trust and hype.
                </p>
                {form.Field({
                  name: 'description',
                  children: (field) => (
                    <textarea
                      className="w-full px-5 py-4 bg-gray-800/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition resize-none"
                      rows={5}
                      placeholder="e.g. $MOGY is the cutest memecoin on Solana. Join the Mogverse and let's go to the moon together! 🐰🌕"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  ),
                })}
              </div>
              {/* Social Links (Optional) */}
              <div className="bg-gray-900/50 backdrop-blur-md border border-cyan-900/30 rounded-2xl p-8 shadow-2xl">
                <h2 className="text-3xl font-bold text-cyan-400 mb-8">Social Links (Optional)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-lg font-medium text-cyan-300 mb-2">Website</label>
                    {form.Field({
                      name: 'website',
                      children: (field) => (
                        <input
                          type="url"
                          className="w-full px-5 py-4 bg-gray-800/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition"
                          placeholder="https://yourwebsite.com"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      ),
                    })}
                  </div>
                  <div>
                    <label className="block text-lg font-medium text-cyan-300 mb-2">Twitter / X</label>
                    {form.Field({
                      name: 'twitter',
                      children: (field) => (
                        <input
                          type="url"
                          className="w-full px-5 py-4 bg-gray-800/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition"
                          placeholder="https://twitter.com/yourusername"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      ),
                    })}
                  </div>
                  <div>
                    <label className="block text-lg font-medium text-cyan-300 mb-2">Telegram</label>
                    {form.Field({
                      name: 'telegram',
                      children: (field) => (
                        <input
                          type="url"
                          className="w-full px-5 py-4 bg-gray-800/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition"
                          placeholder="https://t.me/yourgroup"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      ),
                    })}
                  </div>
                  <div>
                    <label className="block text-lg font-medium text-cyan-300 mb-2">Discord</label>
                    {form.Field({
                      name: 'discord',
                      children: (field) => (
                        <input
                          type="url"
                          className="w-full px-5 py-4 bg-gray-800/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition"
                          placeholder="https://discord.gg/yourinvite"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      ),
                    })}
                  </div>
                </div>
              </div>
              {/* Dev Buy in $MOGY (Optional) – aktiv */}
              <div className="bg-gray-900/50 backdrop-blur-md border border-cyan-900/30 rounded-2xl p-8 shadow-2xl">
                <h2 className="text-3xl font-bold text-cyan-400 mb-8">Dev Buy in $MOGY (Optional)</h2>
                <p className="text-gray-300 mb-6">
                  Buy your own token at launch price using SOL – shows commitment to the community.
                </p>
                {form.Field({
                  name: 'devBuyAmountSol',
                  children: (field) => (
                    <input
                      type="number"
                      step="any" // Jetzt wirklich 0.001, 0.0001 usw. möglich
                      min="0"
                      max="50"
                      className="w-full px-5 py-4 bg-gray-800/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition"
                      placeholder="Amount in SOL (z.B. 0.001, 0.5, max 50)"
                      value={field.state.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.handleChange(val === '' ? '' : parseFloat(val));
                      }}
                    />
                  ),
                })}
                <p className="text-gray-500 text-sm mt-4">
                  Wir swapen SOL zu $MOGY automatisch, wenn nötig – fairer Launch!
                </p>
              </div>
              {/* Creator Rewards Info */}
              <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6 text-center text-gray-400 text-sm">
                <p>
                  Creators automatically receive <strong>2% trading fees</strong> on every trade (paid directly – no claiming needed) + <strong>20% of liquidity</strong> (100% permanently locked for maximum fairness and rug-protection).
                </p>
              </div>
              {/* Submit / Connect Button */}
              <div className="flex justify-end mt-12">
                {!publicKey ? (
                  <Button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 px-8 py-4 md:px-12 md:py-6 text-xl md:text-2xl font-bold rounded-xl shadow-2xl transition"
                  >
                    Connect Wallet to Launch
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 px-8 py-4 md:px-12 md:py-6 text-xl md:text-2xl font-bold rounded-xl shadow-2xl transition flex items-center gap-4"
                  >
                    {isLoading ? (
                      <>
                        <span className="iconify ph--spinner w-8 h-8 animate-spin" />
                        Creating Pool...
                      </>
                    ) : (
                      <>
                        <span className="iconify ph--rocket-bold w-8 h-8" />
                        Launch Pool
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          )}
        </main>
      </div>
    </>
  );
}
const PoolCreationSuccess = () => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-md border border-cyan-900/30 rounded-2xl p-12 text-center shadow-2xl">
      <div className="bg-green-500/20 p-6 rounded-full inline-flex mb-8">
        <span className="iconify ph--check-bold w-16 h-16 text-green-400" />
      </div>
      <h2 className="text-4xl font-bold text-cyan-400 mb-6">Pool Created Successfully!</h2>
      <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
        Your token is now live in the Mogverse. The adventure begins!
      </p>
      <div className="flex flex-col sm:flex-row gap-6 justify-center">
        <Link
          href="/"
          className="px-10 py-5 bg-gray-800/70 hover:bg-gray-700 rounded-xl font-bold text-lg transition"
        >
          Explore Pools
        </Link>
        <button
          onClick={() => window.location.reload()}
          className="px-10 py-5 bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 rounded-xl font-bold text-lg transition"
        >
          Create Another Pool
        </button>
      </div>
    </div>
  );
};
