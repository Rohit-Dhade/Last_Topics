import { sum } from "../utils/func.js";

describe("sum function", () => {
  test("add 1+2 to equal 3", () => {
    expect(sum(1, 2)).toBe(3);
  });

  test("add 5+5 to equal 10", () => {
    expect(sum(5, 5)).toBe(10);
  });

  test("add -1+1 to equal 0", () => {
    expect(sum(-1, 1)).toBe(0);
  });
});
