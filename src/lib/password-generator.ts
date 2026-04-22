import { PasswordGeneratorOptions } from "@/types/vault";

const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const NUMBERS = "23456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";

function getRandomIndex(max: number) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function pickCharacter(characters: string) {
  return characters[getRandomIndex(characters.length)];
}

export function generatePassword(options: PasswordGeneratorOptions) {
  const groups = [
    options.uppercase ? UPPERCASE : "",
    options.lowercase ? LOWERCASE : "",
    options.numbers ? NUMBERS : "",
    options.symbols ? SYMBOLS : "",
  ].filter(Boolean);

  if (groups.length === 0) {
    throw new Error("errors.passwordGroupRequired");
  }

  if (options.length < groups.length) {
    throw new Error("errors.passwordLengthTooShort");
  }

  const pool = groups.join("");
  const password = groups.map((group) => pickCharacter(group));

  while (password.length < options.length) {
    password.push(pickCharacter(pool));
  }

  for (let index = password.length - 1; index > 0; index -= 1) {
    const randomIndex = getRandomIndex(index + 1);
    [password[index], password[randomIndex]] = [
      password[randomIndex],
      password[index],
    ];
  }

  return password.join("");
}
