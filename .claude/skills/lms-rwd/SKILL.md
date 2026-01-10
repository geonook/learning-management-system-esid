---
name: lms-rwd
description: LMS responsive design patterns including breakpoints, components, and implementation guides. Use when implementing responsive design, adding mobile support, fixing RWD issues, or working with MobileNav, Sheet, OrientationGuard components.
---

# LMS RWD (Responsive Web Design) Skill

LMS 響應式設計規範，包含已完成 MVP 元件、斷點定義、實作模式。

## When to use this Skill

- Implementing responsive layouts for LMS pages
- Adding mobile/tablet support to existing pages
- Using MobileNav, Sheet, or OrientationGuard components
- Fixing RWD issues or layout problems on mobile devices
- Following LMS breakpoint conventions (xs, sm, md, lg, xl)

## Quick Start

```tsx
// 1. 表格響應式
<div className="table-responsive">
  <table className="min-w-[600px] w-full">...</table>
</div>

// 2. 手機隱藏元素
<div className="hidden lg:block">Desktop only</div>
<div className="lg:hidden">Mobile/Tablet only</div>

// 3. 響應式 padding
<main className="p-3 sm:p-4 lg:p-6">
```

---

## MVP 完成狀態

**Commit**: `6c7662d` - feat(rwd): implement MVP responsive design for mobile and tablet

已完成項目：
- Tailwind 設定調整（xs 斷點、portrait/landscape/touch variants）
- Sheet 元件 (`components/ui/sheet.tsx`)
- Mobile Navigation (`components/layout/mobile-nav.tsx`)
- Main Layout 響應式 (`components/layout/main-layout.tsx`)
- Header 響應式 (`components/layout/header.tsx`)
- 全域 CSS 觸控友善規則 (`app/globals.css`)
- iPad 直向提示元件 (`components/layout/orientation-guard.tsx`)

---

## 斷點定義

```javascript
// tailwind.config.js
screens: {
  'xs': '375px',   // iPhone SE
  'sm': '640px',   // 大手機
  'md': '768px',   // iPad 直向
  'lg': '1024px',  // iPad 橫向 / 桌機 ← Sidebar 顯示分界線
  'xl': '1280px',  // 大桌機
  '2xl': '1536px', // 大螢幕
}

// 自訂 variants
extend: {
  screens: {
    'portrait': { 'raw': '(orientation: portrait)' },
    'landscape': { 'raw': '(orientation: landscape)' },
    'touch': { 'raw': '(pointer: coarse)' },
  }
}
```

### 斷點語意

| 斷點 | 寬度 | 裝置 | LMS 行為 |
|------|------|------|----------|
| `xs` | 375px+ | iPhone SE | 最小支援寬度 |
| `sm` | 640px+ | 大手機 | 部分元素開始顯示 |
| `md` | 768px+ | iPad 直向 | 搜尋框顯示 |
| **`lg`** | 1024px+ | iPad 橫向/桌機 | **Sidebar 顯示** |
| `xl` | 1280px+ | 大桌機 | 最大寬度內容 |

**重要**：`lg` 是 Sidebar 顯示的分界線，手機/平板使用 hamburger menu

---

## 裝置策略

| 裝置 | 導航方式 | 表格處理 | 特殊處理 |
|------|----------|----------|----------|
| 手機 (<lg) | Hamburger → Sheet | 橫向捲動 | - |
| iPad 直向 (md, portrait) | 提示旋轉 | - | OrientationGuard |
| iPad 橫向 (md+, landscape) | Hamburger → Sheet | 橫向捲動 | - |
| 桌機 (lg+) | Sidebar 永遠顯示 | 正常顯示 | - |

---

## 響應式元件

### 已建立元件

| 元件 | 路徑 | 用途 |
|------|------|------|
| Sheet | `components/ui/sheet.tsx` | 滑出面板（基於 Radix Dialog） |
| MobileNav | `components/layout/mobile-nav.tsx` | 手機/平板導航選單 |
| OrientationGuard | `components/layout/orientation-guard.tsx` | iPad 直向旋轉提示 |

### MobileNav 使用方式

```tsx
import { MobileNav } from "@/components/layout/mobile-nav";

// 在 Header 中使用
<header>
  <MobileNav /> {/* 自動在 lg 以下顯示 hamburger */}
  ...
</header>
```

### OrientationGuard 使用方式

```tsx
import { OrientationGuard } from "@/components/layout/orientation-guard";

// 包裹需要保護的內容
<OrientationGuard>
  <MainContent />
</OrientationGuard>
```

---

## CSS 類別參考

### globals.css 中定義的類別

| 類別 | 用途 |
|------|------|
| `.table-responsive` | 表格橫向捲動容器 |
| `.table-sticky-first` | 第一欄固定 |
| `.safe-area-bottom` | iPhone 瀏海底部安全區 |
| `.safe-area-top` | iPhone 瀏海頂部安全區 |
| `.scrollbar-hide` | 隱藏捲軸但保持功能 |
| `.text-responsive` | 響應式文字 (sm→base) |
| `.text-responsive-lg` | 響應式大文字 (base→lg→xl) |
| `.text-responsive-xl` | 響應式特大文字 (lg→xl→2xl) |

### 觸控規範 (Apple HIG)

在觸控裝置上自動套用：
- 按鈕/連結最小尺寸：44x44px
- 表單輸入高度：44px
- 字體大小：16px（防止 iOS 自動縮放）

---

## 頁面實作模式

### 表格頁面

```tsx
// 包裹表格以支援橫向捲動
<div className="table-responsive">
  <table className="min-w-[600px] w-full">
    {/* 第一欄固定 */}
    <thead>
      <tr>
        <th className="sticky left-0 z-10 bg-surface-elevated">Name</th>
        <th>Column 2</th>
        ...
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="sticky left-0 z-10 bg-surface-elevated">...</td>
        ...
      </tr>
    </tbody>
  </table>
</div>
```

### Filter 區域（響應式）

```tsx
{/* 桌機版：inline 排列 */}
<div className="hidden md:flex flex-wrap items-center gap-4">
  <GlobalFilterBar showYear showTerm />
</div>

{/* 手機版：收合到 Sheet */}
<div className="md:hidden">
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" className="w-full">
        <Filter className="mr-2 h-4 w-4" />
        Filters
        {activeCount > 0 && <Badge className="ml-2">{activeCount}</Badge>}
      </Button>
    </SheetTrigger>
    <SheetContent side="bottom" className="h-auto">
      <GlobalFilterBar showYear showTerm />
    </SheetContent>
  </Sheet>
</div>
```

### Padding 規範

```tsx
// Page content
<main className="p-3 sm:p-4 lg:p-6">

// Card padding
<div className="p-3 sm:p-4">

// Gap between elements
<div className="flex gap-3 sm:gap-4 lg:gap-6">
```

### 常見隱藏模式

```tsx
// 手機隱藏，平板以上顯示
<div className="hidden sm:block">...</div>
<div className="hidden md:block">...</div>

// 僅手機顯示
<div className="sm:hidden">...</div>
<div className="md:hidden">...</div>

// 僅桌機顯示（Sidebar 同級）
<div className="hidden lg:block">...</div>

// 僅手機/平板顯示（hamburger 同級）
<div className="lg:hidden">...</div>
```

---

## Phase 2-4 待完成清單

### Phase 2：高流量頁面

| 頁面 | 檔案 | 修改內容 | 狀態 |
|------|------|----------|------|
| Dashboard | `app/(lms)/dashboard/page.tsx` | 響應式 grid | ⏳ |
| Browse Students | `app/(lms)/browse/students/page.tsx` | 表格捲動 | ⏳ |
| Browse Classes | `app/(lms)/browse/classes/page.tsx` | 表格捲動 | ⏳ |
| Browse Teachers | `app/(lms)/browse/teachers/page.tsx` | 表格捲動 | ⏳ |
| Class Overview | `app/(lms)/class/[classId]/page.tsx` | 響應式 layout | ⏳ |
| Schedule | `app/(lms)/schedule/page.tsx` | 表格/卡片切換 | ⏳ |

### Phase 3：複雜頁面

| 頁面 | 檔案 | 修改內容 | 狀態 |
|------|------|----------|------|
| Gradebook Spreadsheet | `components/gradebook/Spreadsheet.tsx` | sticky 欄位 | ⏳ |
| MAP Statistics | `app/(lms)/browse/stats/map/page.tsx` | 圖表響應式 | ⏳ |
| Browse Gradebook | `app/(lms)/browse/gradebook/page.tsx` | 表格捲動 | ⏳ |
| Head Expectations | `app/(lms)/head/expectations/page.tsx` | 表格捲動 | ⏳ |
| Admin Users | `app/(lms)/admin/users/page.tsx` | 表格捲動 | ⏳ |
| Admin Courses | `app/(lms)/admin/courses/page.tsx` | 表格捲動 | ⏳ |

### Phase 4：收尾

- [ ] 全站跨裝置測試
- [ ] 修復發現的 RWD bugs
- [ ] 更新此 skill 文件

---

## 相關檔案

| 檔案 | 說明 |
|------|------|
| `tailwind.config.js` | 斷點與 variants 設定 |
| `app/globals.css` | RWD CSS 類別定義 |
| `components/ui/sheet.tsx` | Sheet 元件 |
| `components/layout/mobile-nav.tsx` | 手機導航 |
| `components/layout/orientation-guard.tsx` | iPad 直向提示 |
| `components/layout/main-layout.tsx` | 主佈局（整合 OrientationGuard） |
| `components/layout/header.tsx` | Header（整合 MobileNav） |
