import prompts from "prompts";

export async function promptConfirm(message: string, initial = true): Promise<boolean> {
  const { confirmed } = await prompts({
    type: "confirm",
    name: "confirmed",
    message,
    initial,
  });
  return confirmed ?? false;
}

export interface ToolChoice {
  title: string;
  value: string;
  selected: boolean;
}

export async function promptMultiSelect(message: string, choices: ToolChoice[]): Promise<string[]> {
  const { selected } = await prompts({
    type: "multiselect",
    name: "selected",
    message,
    choices: choices.map((c) => ({ title: c.title, value: c.value, selected: c.selected })),
    hint: "- Space to toggle, Return to submit",
  });
  return selected ?? [];
}
