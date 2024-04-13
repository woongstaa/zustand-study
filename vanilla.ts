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

// 스토어를 생성하는 팩토리 함수. 이 함수는 createStoreImpl을 호출하여 스토어 인스턴스를 생성한다.
// @param createState - 스토어의 초기 상태를 설정하는 함수.
// 이 함수가 제공되면, 해당 함수를 사용하여 초기화된 스토어를 생성한다.
// 함수가 제공되지 않는 경우, 기본 createStoreImpl 함수만을 반환한다.
// 이 함수는 스토어의 상태를 설정하고 관리하는 API들({ setState, getState, api })을 인자로 받는다.
export const createStore = ((createState) =>
  createState ? createStoreImpl(createState) : createStoreImpl) as CreateStore
