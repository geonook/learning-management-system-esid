# Chart Specifications

## 1. English Level Comparison Bar Chart

### Purpose
Compare average RIT scores across English Levels (E1, E2, E3) within a grade.

### Configuration

```typescript
interface LevelComparisonChart {
  type: 'bar';
  title: string;        // e.g., "Grade 3 MAP Scores by English Level"
  xAxis: {
    categories: string[];  // ['E1', 'E2', 'E3']
  };
  yAxis: {
    title: string;         // 'Average RIT Score'
    min: number;           // Dynamic, e.g., lowest avg - 20
    max: number;           // Dynamic, e.g., highest avg + 10
  };
  series: Array<{
    name: string;          // 'Language Usage' | 'Reading' | 'Average'
    data: number[];        // [207.76, 190.68, 171.82]
  }>;
}
```

### Example

```
            Grade 3 MAP Scores by English Level
    RIT
    220 |  ██
    210 |  ██
    200 |  ██  ██
    190 |  ██  ██
    180 |  ██  ██  ██
    170 |  ██  ██  ██
    160 |  ██  ██  ██
        +------------------
           E1   E2   E3
    
    █ Language Usage  █ Reading
```

## 2. Term Growth Comparison Chart

### Purpose
Show Fall → Spring growth for each English Level.

### Configuration

```typescript
interface GrowthComparisonChart {
  type: 'groupedBar';
  title: string;        // "Grade 4 Fall vs Spring Comparison"
  xAxis: {
    categories: string[];  // ['E1', 'E2', 'E3', 'All G4']
  };
  series: [
    { name: 'Fall', data: number[] },
    { name: 'Spring', data: number[] }
  ];
  // Optional: Show growth delta labels
  dataLabels: {
    enabled: boolean;
    formatter: (value, ctx) => string;  // Show "+8" growth
  };
}
```

### Example

```
         Grade 4 Language Usage: Fall vs Spring
    RIT
    220 |           ▓▓
    210 |  ░░  ▓▓   ░░  ▓▓
    200 |  ░░  ▓▓   ░░  ▓▓   ░░  ▓▓
    190 |  ░░  ▓▓   ░░  ▓▓   ░░  ▓▓
    180 |  ░░  ▓▓   ░░  ▓▓   ░░  ▓▓
    170 |  ░░  ▓▓   ░░  ▓▓   ░░  ▓▓   ░░  ▓▓
        +--------------------------------
            E1       E2       E3      All
    
    ░ Fall 2024-2025  ▓ Spring 2024-2025
```

## 3. Benchmark Distribution Pie/Donut Chart

### Purpose
Show student distribution across E1/E2/E3 benchmark categories based on **Average (兩科平均)**.

**Important**: Classification uses Average = (Language Usage + Reading) / 2, NOT individual course scores.

### Configuration

```typescript
interface BenchmarkDistributionChart {
  type: 'pie' | 'donut';
  title: string;        // "Grade 3 Benchmark Distribution (by Average)"
  data: Array<{
    name: string;       // 'E1 (≥206)', 'E2 (183-205)', 'E3 (<183)' - thresholds for G3
    value: number;      // Student count
    color: string;      // '#22c55e' (green), '#f59e0b' (yellow), '#ef4444' (red)
  }>;
  // Show percentage in labels
  label: {
    formatter: (params) => `${params.name}: ${params.value} (${params.percent}%)`;
  };
}

// Grade-specific threshold labels:
// G3: E1 (≥206), E2 (183-205), E3 (<183)
// G4: E1 (≥213), E2 (191-212), E3 (<191)
// G5: E1 (≥218), E2 (194-217), E3 (<194)
```

### Color Scheme

| Level | Color | Hex |
|-------|-------|-----|
| E1 | Green | #22c55e |
| E2 | Yellow/Amber | #f59e0b |
| E3 | Red | #ef4444 |

### Example

```
    Grade 3 Benchmark Distribution (by Average)

         ╭──────────────╮
        ╱    E1 (57)     ╲
       │    22.6%         │
       │  ╭─────────╮     │
       │  │  E3(53) │     │
       │  │  21.0%  │     │
       │  ╰─────────╯     │
        ╲   E2 (142)     ╱
         ╰──────────────╯
              56.3%

    Note: Based on Average = (LU + Reading) / 2
```

## 4. Norm Comparison Line Chart

### Purpose
Compare school average against national norm across terms.

### Configuration

```typescript
interface NormComparisonChart {
  type: 'line';
  title: string;        // "Grade 5 Reading: School vs National Norm"
  xAxis: {
    categories: string[];  // ['Fall 2024-2025', 'Spring 2024-2025']
  };
  yAxis: {
    title: string;         // 'RIT Score'
  };
  series: [
    { 
      name: 'School Average',
      data: number[],
      lineStyle: { type: 'solid' }
    },
    { 
      name: 'National Norm',
      data: number[],
      lineStyle: { type: 'dashed' }
    }
  ];
  // Highlight area between lines
  areaStyle?: {
    color: string;  // Green if above norm, red if below
  };
}
```

### Example

```
    Grade 5 Reading: School vs Norm
    RIT
    210 |              ●────● School (202.4)
    205 |         ╱    
    200 |    ●───●          ○----○ Norm (211)
    195 |   
        +------------------------
          Fall 24-25    Spring 24-25
    
    ● School Average  ○ National Norm
```

## 5. Growth Trend Multi-Line Chart

### Purpose
Show RIT score progression over multiple terms for a student or group.

### Configuration

```typescript
interface GrowthTrendChart {
  type: 'line';
  title: string;
  xAxis: {
    categories: string[];  // ['Fall 23-24', 'Spring 23-24', 'Fall 24-25', 'Spring 24-25']
  };
  yAxis: {
    title: string;
  };
  series: Array<{
    name: string;          // Student name or 'Language Usage' / 'Reading'
    data: (number | null)[];  // null for missing terms
    markPoint?: {
      data: [{ type: 'max' }, { type: 'min' }];
    };
  }>;
}
```

## 6. Overview Heatmap/Table

### Purpose
Display all English Level × Term averages in a grid format.

### Configuration

```typescript
interface OverviewTable {
  type: 'table';
  columns: [
    { field: 'englishLevel', header: 'English Level' },
    { field: 'langFall', header: 'Language Usage\nFall' },
    { field: 'langSpring', header: 'Language Usage\nSpring' },
    { field: 'readFall', header: 'Reading\nFall' },
    { field: 'readSpring', header: 'Reading\nSpring' },
    { field: 'avgFall', header: 'Average\nFall' },
    { field: 'avgSpring', header: 'Average\nSpring' },
  ];
  // Conditional formatting
  cellStyle: (value, field, row) => {
    // Compare to norm and color accordingly
    if (value >= norm) return { backgroundColor: '#dcfce7' };  // Light green
    return { backgroundColor: '#fee2e2' };  // Light red
  };
}
```

### Example Layout

```
┌─────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│             │   Language Usage     │      Reading         │      Average         │
│ English     ├──────────┬───────────┼──────────┬───────────┼──────────┬───────────┤
│ Level       │ Fall     │ Spring    │ Fall     │ Spring    │ Fall     │ Spring    │
├─────────────┼──────────┼───────────┼──────────┼───────────┼──────────┼───────────┤
│ G3E1        │ 207.76   │ 210.22    │ 198.86   │ 203.33    │ 203.31   │ 206.77    │
│ G3E2        │ 190.68   │ 195.07    │ 180.34   │ 184.67    │ 185.51   │ 189.87    │
│ G3E3        │ 171.82   │ 173.47    │ 160.00   │ 165.24    │ 165.91   │ 169.35    │
│ All G3      │ 195.41   │ 198.90    │ 185.48   │ 189.87    │ 190.44   │ 194.39    │
├─────────────┼──────────┼───────────┼──────────┼───────────┼──────────┼───────────┤
│ Norm        │ 188      │ 198       │ 187      │ 197       │ 187.5    │ 197.5     │
└─────────────┴──────────┴───────────┴──────────┴───────────┴──────────┴───────────┘
```

## Chart Library Recommendations

### For React/Next.js

1. **Recharts** - Simple, React-native
2. **ECharts** (via echarts-for-react) - More powerful, complex charts
3. **Chart.js** (via react-chartjs-2) - Popular, well-documented

### Basic Recharts Example

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const data = [
  { level: 'E1', languageUsage: 207.76, reading: 198.86 },
  { level: 'E2', languageUsage: 190.68, reading: 180.34 },
  { level: 'E3', languageUsage: 171.82, reading: 160.00 },
];

function LevelComparisonChart() {
  return (
    <BarChart width={600} height={400} data={data}>
      <XAxis dataKey="level" />
      <YAxis domain={[150, 220]} />
      <Tooltip />
      <Legend />
      <Bar dataKey="languageUsage" name="Language Usage" fill="#3b82f6" />
      <Bar dataKey="reading" name="Reading" fill="#10b981" />
    </BarChart>
  );
}
```
