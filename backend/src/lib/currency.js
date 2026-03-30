const INR_PER_ETH = 250000;

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function inrToEth(amountInr) {
  const inr = toNumber(amountInr);
  if (inr <= 0) return 0;
  return inr / INR_PER_ETH;
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
