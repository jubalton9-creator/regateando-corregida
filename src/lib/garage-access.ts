export function canUseGarage(signedIn: boolean, buyer: boolean, seller: boolean) {
  return signedIn && (buyer || seller);
}