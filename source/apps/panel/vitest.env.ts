/*
 * vitest brings in chai, which gives every object a `should` property.
 * Vue's UnwrapRef then rewrites a Moment inside a store ref,
 * so store values stop matching their own types.
 * Nothing in the panel calls chai.should().
 */
declare module "@vue/reactivity" {
  export interface RefUnwrapBailTypes {
    chaiAssertion: Chai.Assertion;
  }
}

export {};
