// import { useDebugValue } from 'react'
// import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
// Those don't work in ESM, because React libs are CJS only.
// See: https://github.com/pmndrs/valtio/issues/452
// The following is a workaround until ESM is supported.
// eslint-disable-next-line import/extensions
import ReactExports from 'react'
// eslint-disable-next-line import/extensions
import useSyncExternalStoreExports from 'use-sync-external-store/shim/with-selector'
import { createStore } from './vanilla.ts'
import type {
  Mutate,
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
} from './vanilla.ts'

const { useDebugValue } = ReactExports
const { useSyncExternalStoreWithSelector } = useSyncExternalStoreExports

type ExtractState<S> = S extends { getState: () => infer T } ? T : never

type ReadonlyStoreApi<T> = Pick<StoreApi<T>, 'getState' | 'subscribe'>

type WithReact<S extends ReadonlyStoreApi<unknown>> = S & {
  /** @deprecated please use api.getInitialState() */
  getServerState?: () => ExtractState<S>
}

let didWarnAboutEqualityFn = false

const identity = <T>(arg: T): T => arg

export function useStore<S extends WithReact<StoreApi<unknown>>>(
  api: S,
): ExtractState<S>

export function useStore<S extends WithReact<StoreApi<unknown>>, U>(
  api: S,
  selector: (state: ExtractState<S>) => U,
): U

// Zustand 스토어 인스턴스, 선택 함수, 비교 함수를 인자로 받는 커스텀 훅
// api: Zustand에서 생성된 스토어 API 인스턴스
// selector: 스토어의 전체 상태에서 필요한 부분만을 선택하여 반환하는 함수
// equalityFn: 선택된 상태의 이전 값과 새 값이 같은지 비교하는 함수
export function useStore<TState, StateSlice>(
  api: WithReact<StoreApi<TState>>,
  selector: (state: TState) => StateSlice = identity as any,
  equalityFn?: (a: StateSlice, b: StateSlice) => boolean,
) {
  // React 18의 useSyncExternalStoreWithSelector를 사용하여 스토어의 상태를 구독하고,
  // 동시성 렌더링에서 발생할 수 있는 tearing 문제를 해결
  const slice = useSyncExternalStoreWithSelector(
    api.subscribe,
    api.getState,
    api.getServerState || api.getInitialState,
    selector,
    equalityFn,
  )

  useDebugValue(slice) // 개발자 도구에서 추적을 용이하게 하는 값 표시
  return slice
}

export type UseBoundStore<S extends WithReact<ReadonlyStoreApi<unknown>>> = {
  (): ExtractState<S>
  <U>(selector: (state: ExtractState<S>) => U): U
  /**
   * @deprecated Use `createWithEqualityFn` from 'zustand/traditional'
   */
    <U>(
    selector: (state: ExtractState<S>) => U,
    equalityFn: (a: U, b: U) => boolean,
  ): U
} & S

type Create = {
  <T, Mos extends [StoreMutatorIdentifier, unknown][] = []>(
    initializer: StateCreator<T, [], Mos>,
  ): UseBoundStore<Mutate<StoreApi<T>, Mos>>
  <T>(): <Mos extends [StoreMutatorIdentifier, unknown][] = []>(
    initializer: StateCreator<T, [], Mos>,
  ) => UseBoundStore<Mutate<StoreApi<T>, Mos>>
  /**
   * @deprecated Use `useStore` hook to bind store
   */
    <S extends StoreApi<unknown>>(store: S): UseBoundStore<S>
}

const createImpl = <T>(createState: StateCreator<T, [], []>) => {
  const api =
    typeof createState === 'function' ? createStore(createState) : createState

  const useBoundStore: any = (selector?: any, equalityFn?: any) =>
    useStore(api, selector, equalityFn)

  Object.assign(useBoundStore, api)

  return useBoundStore
}

export const create = (<T>(createState: StateCreator<T, [], []> | undefined) =>
  createState ? createImpl(createState) : createImpl) as Create
