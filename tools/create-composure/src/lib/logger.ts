import kleur from "kleur";

export const logger = {
  info: (msg: string) => console.log(kleur.blue(msg)),
  success: (msg: string) => console.log(kleur.green(msg)),
  warn: (msg: string) => console.log(kleur.yellow(msg)),
  error: (msg: string) => console.error(kleur.red(msg)),
  note: (msg: string) => console.log(kleur.gray(msg)),
};
