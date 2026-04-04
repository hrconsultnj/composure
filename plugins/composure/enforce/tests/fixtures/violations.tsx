// Test fixture: TypeScript violations — every rule should trigger
// DO NOT fix these — they exist to test detection

const badCast = someValue as any;
const doubleCast = someValue as unknown as SpecificType;
// @ts-ignore
const suppressed = brokenCall();
// eslint-disable @typescript-eslint/no-explicit-any
const eslintOff = true;
const forced = obj!.property;
const unused = await doSomething(_, _result);
function process(data: any, callback: any): any {
  return data as ProcessedData;
}
const hidden: Record<string, any> = {};
const lazy: Function = () => {};
const hiddenArray: Array<any> = [];
