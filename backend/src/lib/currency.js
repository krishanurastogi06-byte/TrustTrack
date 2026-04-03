const INR_PER_ETH = 250000;

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function inrToEth(amountInr) {
  const inr = toNumber(amountInr);
  if (inr <= 0) return 0;
  
  // Direct division then fixed-point rounding to 15 decimals to avoid floating point noise.
  const raw = inr / INR_PER_ETH;
  return Number(raw.toFixed(15));
}

function ethToInr(amountEth) {
  const eth = toNumber(amountEth);
  if (eth <= 0) return 0;
  return eth * INR_PER_ETH;
}

module.exports = {
  INR_PER_ETH,
  inrToEth,
  ethToInr,
};
