# LMS TeacherOS 概念規劃書 (LMS TeacherOS Concept Plan)

> **專案代號**: LMS-TeacherOS
> **目標**: 將 TeacherOS 的 macOS 設計語言延伸至 LMS 系統，打造無縫、直觀且美觀的教學管理體驗。
> **版本**: 1.4.0 (Desktop Folder View Added)

## 1. 設計願景 (Design Vision)

本計畫旨在將 Learning Management System (LMS) 轉型為 **TeacherOS** 生態系的一部分。不再只是傳統的網頁後台，而是一個彷彿原生 macOS 應用程式的教學作業系統。

### 核心設計語言 (Design Language)

- **Glassmorphism (玻璃擬態)**: 使用 `backdrop-filter: blur()` 與半透明背景，創造層次感與現代感。
- **System UI**: 採用類似 macOS 的系統字體 (San Francisco / Inter)、圓角視窗、與精緻的陰影。
- **Immersive Experience (沉浸式體驗)**: 隱藏傳統瀏覽器滾動條，使用自定義滾動條；全螢幕應用程式佈局。
- **Micro-interactions (微互動)**: 按鈕懸停光暈、視窗開啟動畫、流暢的頁面轉場。

---

## 2. 使用者角色與權限 (User Roles)

系統將延續現有的權限架構，但在 UI 上提供不同的 "Workspace" 視角：

| 角色 (Role)                  | 對應 macOS 概念   | 權限描述                                            | UI 顯示策略                                                                      |
| :--------------------------- | :---------------- | :-------------------------------------------------- | :------------------------------------------------------------------------------- |
| **Admin (系統管理員)**       | **Root User**     | 擁有完整系統控制權，包含 Office Member 所有功能。   | 完整功能存取 (可切換視圖)。                                                      |
| **Office Member (行政人員)** | **Admin User**    | **(新增)** 可檢視所有年段 (G1-G6)、所有班級的資訊。 | **Finder (多視圖切換)**：支援 Icon View (資料夾模式) 與 Column View (分欄模式)。 |
| **Head Teacher (年段主任)**  | **Power User**    | 可管理特定年段 (Grade) 的課程與教師。               | 預設顯示該年段的所有班級。                                                       |
| **Teacher (LT/IT/KCFS)**     | **Standard User** | 專注於自己的班級 (Classes) 與課程 (Courses)。       | 僅顯示自己授課的班級卡片。                                                       |

---

## 3. 功能模組規劃 (Functional Modules)

我們將 LMS 的核心功能映射為 TeacherOS 中的 "Apps" 或系統組件，並針對重點功能進行強化：

### 3.1 系統介面 (System Interface)

- **Desktop (桌面)**: 應用程式的主要背景，動態桌布 (Dynamic Wallpaper) 隨時間或主題變化。
- **Dock (程式塢)**: 位於底部或側邊的導航列，包含常用功能的圖示。
- **Menu Bar (頂部選單)**: 顯示全域狀態 (SSO 使用者資訊、通知中心、搜尋 Spotlight)。

### 3.2 應用程式映射 (App Mapping)

| LMS 功能                            | TeacherOS App 概念            | 設計風格參考          | 功能描述                                                                                   |
| :---------------------------------- | :---------------------------- | :-------------------- | :----------------------------------------------------------------------------------------- |
| **Dashboard (儀表板)**              | **Mission Control / Widgets** | macOS Widgets         | 顯示今日課表、待辦事項、最新通知、班級概況小卡。支援拖拉排序。                             |
| **Classes & Students (班級與學生)** | **Finder / Contacts**         | Finder Views          | **(重點優化)** 支援 Icon View (資料夾) 與 Column View (分欄) 切換，滿足不同瀏覽習慣。      |
| **Gradebook (成績冊)**              | **Numbers**                   | Apple Numbers         | **(重點功能)** 類似 Google Sheets 的操作體驗。支援完整學制與評量架構。                     |
| **Communication Logs (電訪紀錄)**   | **Notes / Contacts**          | Apple Notes           | **(重點功能)** 以「學生」為單位的紀錄系統。左側為學生列表，右側為時間軸式的通話/訪談紀錄。 |
| **Analytics (統計分析)**            | **Stocks / Grapher**          | macOS Stocks          | **(重點功能)** 包含「學生個人趨勢」與「班級比較儀表板」。深色模式下呈現高對比霓虹風格。    |
| **Attendance (點名)**               | **Calendar**                  | Apple Calendar        | 日曆視圖查看出缺席紀錄，或清單視圖進行快速點名。                                           |
| **Settings (設定)**                 | **System Settings**           | macOS System Settings | 側邊欄導航的設定介面，包含個人檔案、通知偏好、顯示設定。                                   |

---

## 4. 重點功能詳細設計 (Key Features Detail)

### 4.0 Office Member UI 解決方案 (Finder Views)

為了提供最直觀的操作體驗，我們將模仿 macOS Finder 提供兩種檢視模式，使用者可隨時切換：

#### 4.0.1 Icon View (資料夾模式 - 預設)

- **概念**: 類似 macOS 桌面或 Finder 的圖示檢視。
- **層級一 (Root)**: 顯示 6 個「年段資料夾」 (G1 - G6)。
- **層級二 (Grade)**: 點擊 G1 資料夾後，進入該年段，顯示該年段的所有「班級資料夾」 (G101, G102...)。
- **層級三 (Class)**: 點擊班級資料夾後，顯示該班級的「功能圖示」 (Students, Gradebook, Logs)。
- **優點**: 直觀、視覺化強、符合一般電腦操作習慣。

#### 4.0.2 Column View (分欄模式 - 進階)

- **概念**: 類似 macOS Finder 的分欄檢視，適合快速瀏覽與深層導航。
- **操作**: 左欄點選 G1 -> 中欄顯示 G1 班級列表 -> 右欄顯示選定班級的詳細資訊。
- **優點**: 減少點擊次數、快速在不同層級間切換。

### 4.1 Gradebook (成績登記表) - Numbers Style

- **核心體驗**: 打造 "Excel-like" 或 "Google Sheets-like" 的流暢體驗。
- **功能特性**:
  - **Grid View**: 學生為列 (Row)，評量項目 (Assessment) 為欄 (Column)。
  - **Keyboard Navigation**: 支援方向鍵移動焦點，Enter 編輯/確認。
  - **Bulk Actions**: 支援拖曳填滿 (Drag-to-fill)、複製貼上 (Copy-Paste from Excel)。
  - **Auto-Save**: 每個儲存格修改後自動儲存，並有 "Saving..." / "Saved" 狀態指示。

#### 4.1.1 學制與評量架構 (Academic Structure & Assessments)

- **學年結構 (Academic Year)**: 分為 **Fall Semester (秋季)** 與 **Spring Semester (春季)**。
- **學期結構 (Semester Structure)**: 每個學期包含兩個 Terms：
  - **Term 1 (期中階段)**: 包含 Midterm Assessment。
  - **Term 2 (期末階段)**: 包含 Final Assessment。
- **評量類別 (Assessment Categories)**:
  1.  **Formative Assessments (FA)**: 平時考、作業、課堂表現。
  2.  **Summative Assessments (SA)**: 單元考、專題報告。
  3.  **Exams**: Midterm Exam (期中考), Final Exam (期末考)。
  4.  **Standardized Tests (其他考試)**: Map, STAR, AR (獨立紀錄，用於追蹤與分析)。

#### 4.1.2 成績計算邏輯 (Grading Logic)

- **Term 1 Grade**:
  - 組成: `Formative Assessment Average` + `Summative Assessment Average` + `Midterm Assessment`
- **Term 2 Grade**:
  - 組成: `Formative Assessment Average` + `Summative Assessment Average` + `Final Assessment`
- **Semester Grade**:
  - 通常由 Term 1 與 Term 2 成績加權計算得出。

### 4.2 Communication Logs (電訪紀錄表) - Notes Style

- **核心體驗**: 類似 Apple Notes 或通訊軟體的對話紀錄風格，強調「以學生為中心」。
- **介面佈局**:
  - **Sidebar**: 學生列表 (可依班級篩選)，顯示最近聯絡時間。
  - **Main Area**: 時間軸 (Timeline) 顯示歷史紀錄。
  - **Editor**: 底部或頂部有快速輸入框，支援標籤 (Tag) 如 #電訪 #面談 #家長會。
- **功能特性**:
  - **Templates**: 內建常用樣板 (例如：期中反饋、缺席關心)。
  - **Privacy**: 可設定紀錄的可見範圍 (僅自己/Head Teacher 可見)。

### 4.3 Analytics (統計分析) - Stocks Style

- **Student Trends (學生成績趨勢)**:
  - **Line Chart**: 顯示該生在不同學期/評量的成績變化曲線。
  - **Radar Chart**: 顯示五力分析 (例如：閱讀、寫作、口說、聽力、參與度)。
- **Class Dashboard (班級統計儀表板)**:
  - **Comparison**: 各班級平均分比較長條圖。
  - **Distribution**: 成績分佈直方圖 (Histogram)，快速看出落後/領先群。
  - **At-Risk Alert**: 自動列出成績大幅下滑或不及格的學生名單。

---

## 5. SSO 轉場體驗 (SSO Transition Experience)

從 Info Hub (TeacherOS Portal) 跳轉至 LMS 的過程，不應只是單調的重新導向，而是一個「啟動應用程式」的過程。

### 流程設計

1.  **Trigger**: 使用者在 Info Hub 點擊 "LMS" 圖示。
2.  **Launch Animation**:
    - 畫面中心出現 LMS Logo (呼吸燈效果)。
    - 背景模糊化 (Blur)，模擬 macOS 開啟 Launchpad 或應用程式時的縮放效果。
    - 顯示 "Booting TeacherOS LMS..." 或 "Loading Workspace..." 的精緻進度條。
    - **無縫銜接**: 透過 SSO Token 交換完成後，直接進入 Dashboard，無需再次登入。
3.  **Landing**: 進入 LMS Desktop，Dock 圖示依序彈出 (Spring animation)，視窗展開。

---

## 6. 下一步執行計畫 (Next Steps)

1.  **UI 框架搭建**: 建立 `TeacherOSLayout`，包含 Dock, MenuBar, Desktop 背景。
2.  **SSO 轉場頁面**: 實作 `/auth/login` 的載入動畫與 SSO 處理邏輯。
3.  **Gradebook 開發**: 評估並整合 `ag-grid` 或 `react-data-grid` 實現試算表體驗。
4.  **Communication Logs 開發**: 建立資料表 `communication_logs` 並實作 UI。
5.  **Analytics 開發**: 整合 `Recharts` 實作視覺化圖表。

---

> **註**: 本規劃將優先確保與現有資料庫架構 (Supabase) 相容，主要變革在於前端互動與視覺呈現。
