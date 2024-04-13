# Zustand

### 0.
zustand는 최근 눈에 띄게 부상중인 전역 상태관리 라이브러리입니다.

이번에 우연히 배민 유튜브를 보다가 프론트엔트 상태관리를 server side에선 react-query를, client side에선  zustand를 사용하고 있으며, 전역상태를 최소화하고 있다고 들었는데, 저의 개발 가치관과 잘 맞는 것 같아 이번 기회에 zustand에 대해 더욱 관심이 생겨 공부해보기로 했습니다

redux처럼 FLUX 패턴을 이용해서 상태를 관리하고 있지만, 신기하게도 context api를 사용하지 않고 이벤트 리스너에 변수를 등록해 클로저로 상태 값을 유지하면서 전역적으로 상태를 관리하는 것 같습니다.

이런 특징 덕분에 컴포넌트 혹은 훅에서 독립해서 스토어를 생성해서 관리할 수 있으며, 컴포넌트 외부에서도 상태 값을 관리할 수 있는 장점이 있습니다.

### 1. Vanilla JS
Zustand의 바닐라 코드를 살펴보면, 엄청난 기능에 비해 코드가 엄청 간단하게 구성되어 있었습니다.
```ts
// 스토어를 생성하는 팩토리 함수. 이 함수는 createStoreImpl을 호출하여 스토어 인스턴스를 생성한다.
// @param createState - 스토어의 초기 상태를 설정하는 함수.
// 이 함수가 제공되면, 해당 함수를 사용하여 초기화된 스토어를 생성한다.
// 함수가 제공되지 않는 경우, 기본 createStoreImpl 함수만을 반환한다.
// 이 함수는 스토어의 상태를 설정하고 관리하는 API들({ setState, getState, api })을 인자로 받는다.
export const createStore = ((createState) =>
  createState ? createStoreImpl(createState) : createStoreImpl) as CreateStore
```
1. `createStore`로 스토어를 생성합니다.
2. 생성한 스토어는 `createState`라는 인자를 받으며, 인자는 `set`, `get`, `api`를 받습니다.
   - `set`은 스토어에 등록된 값을 업데이트하기 위해 사용합니다.
   - `get`은 스토어에 등록된 값을 가져오기위해 사용합니다.
   - `api`는 생성된 스토어에 `get`, `set` 이외의 세부적인 조작을 하기위해 사용합니다.
     - eg. 강제 상태 값 업데이트, 스토어에 등록된 리스너 삭제
```ts
// createStore를 위해 사용하는 팩토리함수 createStoreImpl
const createStoreImpl: CreateStoreImpl = (createState) => {
  type TState = ReturnType<typeof createState>
  type Listener = (state: TState, prevState: TState) => void

  // state를 let으로 선언하여 클로저를 통해 상태를 유지하고 관리
  let state: TState

  // 리스너를 중복 없이 관리하기 위해 Set 데이터 구조를 사용
  const listeners: Set<Listener> = new Set()

  // setState는 새로운 상태 또는 상태를 업데이트하는 함수를 받고, replace 플래그를 사용하여 상태를 교체할지 결정
  const setState: StoreApi<TState>['setState'] = (partial, replace) => {

    // nextState는 인자로 받은 partial이 함수인 경우 현재 상태를 기반으로 새 상태를 계산하고,
    // 아닌 경우 partial 자체가 새 상태가 된다.
    const nextState =
      typeof partial === 'function'
        ? (partial as (state: TState) => TState)(state)
        : partial

    // nextState와 현재 state가 다른지 Object.is를 통해 비교한다.

    // Object.is()는 기본형 데이터면 메모리 주소가 달라도 값을 제대로 비교할 수 있으나
    // 참조형 자료구조에는 메모리 주소가 같은지 검사
    // Nan의 값이 동일한지와 +0 -0이 같은지 비교에서 유용한 메서드

    // nextState와 state가 다르다면 if문 내부의 동작이 일어남
    if (!Object.is(nextState, state)) {
      // 기존의 state를 previousState로 복사
      const previousState = state

      // replace가 true이거나 nextState가 객체가 아니거나 nextState가 null인 경우 nextState를 직접 할당한다.
      // 그렇지 않은 경우에는 기존 state와 nextState를 합쳐 새로운 객체를 생성하여 할당한다.
      state =
        replace ?? (typeof nextState !== 'object' || nextState === null)
          ? (nextState as TState)
          : Object.assign({}, state, nextState)

      // 모든 리스너를 순회하면서 업데이트된 상태와 이전 상태를 전달한다.
      listeners.forEach((listener) => listener(state, previousState))
    }
  }

  // 그냥 state를 반환하는 함수
  // 말 그대로 현재 state의 상태를 조회하는 역할을 한다
  const getState: StoreApi<TState>['getState'] = () => state

  // initialState를 인자로 받았다면, 바로 Store를 생성할 수 있도록 하는 함수
  const getInitialState: StoreApi<TState>['getInitialState'] = () =>
    initialState

  // 가장 핵심적인 로직이라고 할 수 있다
  // 위에서 Set으로 생성한 listner를 이벤트 리스너에 등록하였으며,
  // 리턴문에 이벤트 리스너에서 제거함으로 메모리 누수도 막고 있다.
  const subscribe: StoreApi<TState>['subscribe'] = (listener) => {
    listeners.add(listener)
    // Unsubscribe
    return () => listeners.delete(listener)
  }

  // 스토어 내부의 모든 리스너를 지우는 함수
  const destroy: StoreApi<TState>['destroy'] = () => {
    listeners.clear()
  }

  // 생성한 스토어의 함수들을 묶어서 리턴하기 위해 선언
  const api = { setState, getState, getInitialState, subscribe, destroy }

  // createState 함수를 호출하여 스토어의 초기 상태를 설정하고, 이를 state 변수에 할당한다.
  const initialState = (state = createState(setState, getState, api))
  return api as any
}
```

### 2. React
위 바닐라 코드를 이용해 리액트에서는 훅으로 스토어를 생성 및 구독할 수 있습니다.
```ts
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
```
리액트에서 사용할 수 있는 코드는 바닐라 자바스크립트에서 본 패턴과 비슷하게 작성되어있습니다. 그 중에서도 집중해서 살펴볼 포인트는 `useSyncExternalStoreWithSelector`를 이용해서 `React 18`부터 지원되는 동시성 렌더링에서 발생할 수 있는 `tearing` 문제를 해결하고 있습니다. 

`tearing`은 `useTransition`같은 훅으로 렌더링되는 우선순위를 결정할 수 있는데, 외부 상태관리 라이브러리와 충돌이 일어나 기대하는 렌더링이 제대로 일어나지 않는 문제를 말합니다.
### 3. Life cycle
위 내용들을 가지고 실제로 사용하는 예제를 살펴본다면,
```ts
import { create } from 'zustand'

const useBearStore = create((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  removeAllBears: () => set({ bears: 0 }),
}))
```
1. `useBearStore`는 `create`를 사용하여 생성된 `Zustand` 스토어의 **커스텀 훅**입니다. 이 커스텀 훅을 통해 스토어의 상태를 직접적으로 관리할 수 있습니다.
2. `create` 함수의 인자로 `( set ) => ( ... )`를 넣어줬습니다.
   - 이는 생성한 스토어의 초기 값을 설정 해준 것이며, `set`, `get`, `api` 인자 중 첫번째 인자인 `set`에 할당한 것을 확인할 수 있습니다.
3. 이렇게 생성한 스토어는 생성된 인스턴스의 리턴된 `api` 객체 속 `set(setState)`를 **콜백함수**의 인자로 가져왔으며, `increasePopulation`과 `removeAllBears`를 통해 값을 업데이트 할 수 있도록 만들고 있습니다.

### 4. 마무리
zustand에 대해 간단하게 알아봤습니다. react-query와 jotai를 만든 개발자들이 함께 만든 라이브러리라 엄청나게 어려운 코드가 있는 줄 알았지만, 제가 이해할 수 있을 정도의 코드로 구성되어있다는게 놀라울 뿐 입니다. 아이디어가 정말 대단하고 이를 실제로 구현하여 많은 이용자들이 사용하고 있다는게 두 개발자분들이 대단하다고 느껴집니다.

새롭게 레거시코드를 정리하면서 서버사이드 상태는 react-query, 클라이언트 사이드 상태는 zustand로 관리하려고 코드를 작성하고 있었는데, 이번 기회에 구동원리에 대해 알게되어 잘 사용할 수 있게 되지 않을까 싶습니다. 

### 5. Reference
[Toast UI 블로그](https://ui.toast.com/posts/ko_20210812)

[배민 우아콘 유튜브](https://youtu.be/nkXIpGjVxWU?si=yYBfF2RoZOxy_zoI)

[zustand github](https://github.com/pmndrs/zustand)
