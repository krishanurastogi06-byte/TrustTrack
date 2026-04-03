const { inrToEth } = require('./src/lib/currency');
const { ethers } = require('ethers');

// Test Case: 10,000 INR @ 250,000 rate should be EXACTly 0.04 ETH (4e16 Wei)
const amountInr = 10000;
const eth = inrToEth(amountInr);

console.log('Testing 10,000 INR -> ETH conversion:');
console.log('Resulting ETH Number:', eth);
console.log('Resulting ETH fixed(15):', eth.toFixed(15));

const amountWei = ethers.parseEther(eth.toFixed(15));
console.log('Resulting Wei:', amountWei.toString());
const expectedWei = '40000000000000000';

if (amountWei.toString() === expectedWei) {
    console.log('SUCCESS: Precision error cleared. (Expected 40000000000000000)');
} else {
    console.error('FAILURE: Still seeing precision error. Got:', amountWei.toString());
    process.exit(1);
}
