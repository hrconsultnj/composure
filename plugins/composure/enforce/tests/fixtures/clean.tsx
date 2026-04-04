// Test fixture: Clean TypeScript — zero violations expected

interface UserData {
  id: string;
  name: string;
  email: string;
}

function processUser(data: UserData): UserData {
  return {
    ...data,
    name: data.name.trim(),
  };
}

const result: Record<string, unknown> = {};
const items: Array<string> = [];
const value = obj?.property ?? "default";

export { processUser, type UserData };
