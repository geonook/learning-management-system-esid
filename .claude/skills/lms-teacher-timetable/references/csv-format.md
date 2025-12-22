# CSV Data Formats

## english_timetable.csv (~1,289 records)

| Field | Description | Example |
|-------|-------------|---------|
| Day | Weekday | Monday |
| Classroom | Room code | E101, E203, E306 |
| Teacher | Teacher name | 張家芸 Kenny |
| Period | Period + time | (3)10:20-11:00 |
| ClassName | Class name | G1 Visionaries |

```csv
Day,Classroom,Teacher,Period,ClassName
Monday,E101,張家芸 Kenny,(3)10:20-11:00,G1 Visionaries
Monday,E101,張家芸 Kenny,(4)11:05-11:45,G1 Visionaries
Monday,E101,張家芸 Kenny,(5)12:55-13:35,G1 Inventors
Monday,E203,林慧君 Liza,(3)10:20-11:00,G1 Discoverers
```

## homeroom_timetable.csv (~1,036 records)

| Field | Description | Example |
|-------|-------------|---------|
| Day | Weekday | Monday |
| Home Room Class Name | Class number | 101, 201, 301 |
| Period | Period + time | (1)08:25-09:05 |
| Classroom | Room name | 一年一班 |
| Teacher | Teacher name | 温小嫺 |
| Course Name | Subject | 國語, 數學, 生活, 社會 |

```csv
Day,Home Room Class Name,Period,Classroom,Teacher,Course Name
Monday,101,(1)08:25-09:05,一年一班,温小嫺,生活
Monday,201,(1)08:25-09:05,二年一班,莊佳珍,國語
Monday,301,(1)08:25-09:05,三年一班,周兆翃,國語
```

## teachers.csv (73 records)

| Field | Description | Example |
|-------|-------------|---------|
| employee_id | Employee number | C11208015 |
| chinese_name | Chinese name | 張家芸 |
| english_name | English name | Kenny |
| title | Title | Ms. / Mr. / Mrs. |
| display_name | Display name | Ms. Kenny |
| email | Email (unique) | kennyjhang@kcislk.ntpc.edu.tw |
| teacher_name | Timetable key | 張家芸 Kenny |

```csv
employee_id,chinese_name,english_name,title,display_name,email,teacher_name
C11208015,張家芸,Kenny,Ms.,Ms. Kenny,kennyjhang@kcislk.ntpc.edu.tw,張家芸 Kenny
C10707009,林慧君,Liza,Ms.,Ms. Liza,lizalin@kcislk.ntpc.edu.tw,林慧君 Liza
```

## Period Parsing

Period format: `(n)HH:MM-HH:MM`

```typescript
function parsePeriod(periodStr: string): { period: number; time: string } | null {
  const match = periodStr.match(/\((\d+)\)([\d:]+[-][\d:]+)/);
  if (match) {
    return {
      period: parseInt(match[1]),
      time: match[2]
    };
  }
  return null;
}
```

## Teacher Name Formats

| Type | Format | Example |
|------|--------|---------|
| Local | `{chinese} {english}` | 張家芸 Kenny |
| Foreign | `{first} {last}` | Jonathan Perry |
| No English | `{chinese}` | 黃勤媛 |

## Email Domain

All emails: `@kcislk.ntpc.edu.tw`
