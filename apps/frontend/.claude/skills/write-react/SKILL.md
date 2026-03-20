---
name: write-react
description: 이 프로젝트의 React/TypeScript 컴포넌트 또는 파일을 새로 작성합니다. 프로젝트 코딩 컨벤션을 따라 코드를 생성할 때 사용합니다.
argument-hint: <파일 경로 또는 작성할 내용 설명>
---

## 프로젝트 코드 작성 규칙

$ARGUMENTS 에 대한 코드를 작성합니다. 아래 컨벤션을 반드시 따릅니다.

### 기술 스택

- React 19, TypeScript 5, Tailwind CSS v4
- UI 컴포넌트: Radix UI + class-variance-authority (cva) + clsx/tailwind-merge (`cn`)
- 아이콘: lucide-react
- 빌드: Vite

### 파일 명명 규칙

- 모든 파일명은 **kebab-case** 사용 (예: `asset-library-page.tsx`)
- 컴포넌트 파일: `.tsx`
- 비컴포넌트 로직 파일: `.ts`
- 타입 정의만 있는 파일: `-model.ts` 접미사 (예: `asset-library-page-model.ts`)
- 컨테이너 컴포넌트: `-container.tsx` 접미사

### TypeScript 규칙

- 모든 함수에 **명시적 반환 타입** 작성 (`: React.JSX.Element`, `: void`, `: Promise<void>` 등)
- `import type` 으로 타입 전용 import 구분
- `any` 사용 금지, 에러는 `error: unknown` 으로 받고 `instanceof Error` 로 좁힘
- interface 이름: 역할 접미사 사용 (`View`, `Input`, `Props` 등)
- 단순 객체 형태는 `interface`, 유니온/교차는 `type`

### 컴포넌트 패턴

#### Container / Presenter 분리
- **Container** (`*-container.tsx`): 상태, API 호출, 이벤트 핸들러 담당. JSX 최소화.
- **Presenter** (`*.tsx`): UI 렌더링만 담당. 순수 함수형 컴포넌트.

#### 상태 관리
```ts
// 상태를 하나의 인터페이스로 묶어 관리
interface MyPageState {
  isLoading: boolean;
  data: DataView[];
  errorMessage: string | null;
}

const [state, setState] = useState<MyPageState>({ ... });

// 상태 업데이트는 항상 함수형으로
setState((currentState) => ({ ...currentState, isLoading: false }));
```

#### useEffect 클린업
```ts
useEffect(() => {
  let isActive = true;

  async function load(): Promise<void> {
    const result = await api.fetch();
    if (!isActive) return;
    setState(...);
  }

  void load();

  return () => { isActive = false; };
}, []);
```

#### 이벤트 핸들러
- 함수명은 `handle` 접두사 (예: `handleDeleteAsset`)
- props로 전달할 콜백은 `on` 접두사 (예: `onDeleteAsset`)
- 비동기 핸들러는 `async function handleXxx(): Promise<void>` 형태

### UI 컴포넌트 작성 규칙

- `src/components/ui/` 의 기존 컴포넌트 재사용 우선 (`Button`, `Input`, `Dialog`, `Select`, `Tabs` 등)
- 새 UI 기본 컴포넌트는 Radix UI 래핑 + `cva` + `cn` 패턴으로 작성
- `React.forwardRef` 사용, `displayName` 명시
- className 조합은 항상 `cn()` 사용

```tsx
import { cn } from "../../lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const myVariants = cva("base-class", {
  variants: { variant: { default: "..." } },
  defaultVariants: { variant: "default" }
});

export interface MyProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof myVariants> {}

const MyComponent = React.forwardRef<HTMLDivElement, MyProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(myVariants({ variant, className }))} {...props} />
  )
);
MyComponent.displayName = "MyComponent";
```

### Props 규칙

- Props 인터페이스는 컴포넌트 바로 위에 선언
- 알파벳순 정렬
- JSX 속성도 알파벳순 정렬

```tsx
interface MyComponentProps {
  isDisabled?: boolean;
  label: string;
  onSubmit: () => void;
}

export function MyComponent({ isDisabled = false, label, onSubmit }: MyComponentProps): React.JSX.Element {
```

### 에러 처리

```ts
try {
  await api.doSomething();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  setState((s) => ({ ...s, errorMessage: message }));
}
```

### API 호출

- `src/dashboard-api.ts` 의 `createDashboardApi()` 팩토리 사용
- 컴포넌트 외부에서 인스턴스 생성 (`const dashboardApi = createDashboardApi();`)

### 작업 절차

1. 요청 내용을 파악하고 필요한 파일 목록을 결정합니다.
2. 기존 관련 파일을 먼저 읽어 컨텍스트를 파악합니다.
3. 위 컨벤션을 적용하여 코드를 작성합니다.
4. 작성 후 타입 오류 가능성, props 누락, 클린업 누락 여부를 자체 점검합니다.
