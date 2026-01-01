export type SignRawHashFunction = (params: {
  address: string;
  chainType: 'aptos';
  hash: `0x${string}`;
}) => Promise<{ signature: string }>;

