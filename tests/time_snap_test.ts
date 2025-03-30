import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Test NFT minting",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    // Test minting as owner
    let block = chain.mineBlock([
      Tx.contractCall('time-snap', 'mint-nft', 
        [types.ascii("Test NFT"), types.uint(100), types.principal(wallet1.address)],
        deployer.address
      )
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    
    // Test minting as non-owner (should fail)
    block = chain.mineBlock([
      Tx.contractCall('time-snap', 'mint-nft',
        [types.ascii("Test NFT"), types.uint(100), types.principal(wallet1.address)],
        wallet1.address
      )
    ]);
    block.receipts[0].result.expectErr().expectUint(100);
  }
});

Clarinet.test({
  name: "Test NFT transfer and expiration",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    
    // Mint NFT
    let block = chain.mineBlock([
      Tx.contractCall('time-snap', 'mint-nft',
        [types.ascii("Test NFT"), types.uint(10), types.principal(wallet1.address)],
        deployer.address
      )
    ]);
    
    // Test transfer
    block = chain.mineBlock([
      Tx.contractCall('time-snap', 'transfer',
        [types.uint(1), types.principal(wallet1.address), types.principal(wallet2.address)],
        wallet1.address
      )
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    
    // Advance chain past expiration
    chain.mineEmptyBlockUntil(20);
    
    // Test transfer of expired NFT (should fail)
    block = chain.mineBlock([
      Tx.contractCall('time-snap', 'transfer',
        [types.uint(1), types.principal(wallet2.address), types.principal(wallet1.address)],
        wallet2.address
      )
    ]);
    block.receipts[0].result.expectErr().expectUint(102);
  }
});

Clarinet.test({
  name: "Test NFT validity and burn",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    // Mint NFT
    let block = chain.mineBlock([
      Tx.contractCall('time-snap', 'mint-nft',
        [types.ascii("Test NFT"), types.uint(5), types.principal(wallet1.address)],
        deployer.address
      )
    ]);
    
    // Check validity
    let response = chain.callReadOnlyFn('time-snap', 'is-valid',
      [types.uint(1)],
      deployer.address
    );
    response.result.expectBool(true);
    
    // Advance chain past expiration
    chain.mineEmptyBlockUntil(10);
    
    // Check invalidity
    response = chain.callReadOnlyFn('time-snap', 'is-valid',
      [types.uint(1)],
      deployer.address
    );
    response.result.expectBool(false);
    
    // Burn expired NFT
    block = chain.mineBlock([
      Tx.contractCall('time-snap', 'burn',
        [types.uint(1)],
        wallet1.address
      )
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
  }
});
