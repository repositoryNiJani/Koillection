// Random little databases. Each builder returns tables:
//   { name, columns: [{ name, type }], rows: [[...]] }
// Everything is built from the seeded rng, so it is repeatable.

const FIRST_NAMES = [
  'Ana', 'Ben', 'Carla', 'Dante', 'Elena', 'Felix', 'Gina', 'Hugo', 'Iris', 'Jomar',
  'Kara', 'Luis', 'Mara', 'Nico', 'Olive', 'Paolo', 'Queenie', 'Rico', 'Sofia', 'Tomas',
  'Uma', 'Vince', 'Wendy', 'Yael', 'Zandro',
];
const CITIES = ['Manila', 'Cebu', 'Davao', 'Baguio', 'Iloilo', 'Quezon City'];
const COURSES = ['IT', 'Nursing', 'Business', 'Engineering', 'Education'];
const DEPARTMENTS = ['Engineering', 'Sales', 'HR', 'Finance', 'Support', 'Marketing'];
export const ORDER_STATUSES = ['paid', 'pending', 'cancelled'];

export function students(rng) {
  const n = rng.int(14, 20);
  const cities = rng.sample(CITIES, 4);
  const courses = rng.sample(COURSES, rng.int(3, 4));
  const names = rng.sample(FIRST_NAMES, n);
  const rows = names.map((name, i) => [
    i + 1,
    name,
    rng.pick(cities),
    rng.int(65, 99),
    rng.int(17, 24),
    rng.pick(courses),
  ]);
  return [
    {
      name: 'students',
      columns: [
        { name: 'id', type: 'INTEGER PRIMARY KEY' },
        { name: 'name', type: 'TEXT' },
        { name: 'city', type: 'TEXT' },
        { name: 'grade', type: 'INTEGER' },
        { name: 'age', type: 'INTEGER' },
        { name: 'course', type: 'TEXT' },
      ],
      rows,
    },
  ];
}

export function shop(rng) {
  const nCustomers = rng.int(10, 12);
  const cities = rng.sample(CITIES, 4);
  const names = rng.sample(FIRST_NAMES, nCustomers);
  const customers = names.map((name, i) => [i + 1, name, rng.pick(cities)]);

  // The last 3 customers never order, so "customers with no orders" has an answer.
  const buyers = nCustomers - 3;
  const nOrders = rng.int(24, 36);
  const orders = [];
  for (let i = 0; i < nOrders; i++) {
    orders.push([
      i + 1,
      rng.int(1, buyers),
      rng.int(4, 40) * 50, // 200 .. 2000, whole numbers
      rng.pick(ORDER_STATUSES),
      rng.int(1, 12),
    ]);
  }
  return [
    {
      name: 'customers',
      columns: [
        { name: 'id', type: 'INTEGER PRIMARY KEY' },
        { name: 'name', type: 'TEXT' },
        { name: 'city', type: 'TEXT' },
      ],
      rows: customers,
    },
    {
      name: 'orders',
      columns: [
        { name: 'id', type: 'INTEGER PRIMARY KEY' },
        { name: 'customer_id', type: 'INTEGER' },
        { name: 'amount', type: 'INTEGER' },
        { name: 'status', type: 'TEXT' },
        { name: 'month', type: 'INTEGER' },
      ],
      rows: orders,
    },
  ];
}

export function company(rng) {
  const depts = rng.sample(DEPARTMENTS, 4);
  const departments = depts.map((name, i) => [i + 1, name]);
  const n = rng.int(14, 18);
  const names = rng.sample(FIRST_NAMES, n);
  const employees = names.map((name, i) => [
    i + 1,
    name,
    // first 8 people guarantee every department has at least 2 employees
    i < 8 ? (i % 4) + 1 : rng.int(1, 4),
    rng.int(30, 180) * 500, // 15000 .. 90000
    rng.int(2012, 2025),
  ]);
  return [
    {
      name: 'departments',
      columns: [
        { name: 'id', type: 'INTEGER PRIMARY KEY' },
        { name: 'name', type: 'TEXT' },
      ],
      rows: departments,
    },
    {
      name: 'employees',
      columns: [
        { name: 'id', type: 'INTEGER PRIMARY KEY' },
        { name: 'name', type: 'TEXT' },
        { name: 'dept_id', type: 'INTEGER' },
        { name: 'salary', type: 'INTEGER' },
        { name: 'hire_year', type: 'INTEGER' },
      ],
      rows: employees,
    },
  ];
}

function sqlValue(v) {
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

export function toSetupSql(tables) {
  const parts = [];
  for (const t of tables) {
    parts.push(
      `CREATE TABLE ${t.name} (${t.columns.map((c) => `${c.name} ${c.type}`).join(', ')});`,
    );
    for (const row of t.rows) {
      parts.push(`INSERT INTO ${t.name} VALUES (${row.map(sqlValue).join(', ')});`);
    }
  }
  return parts.join('\n');
}

export const THEMES = { students, shop, company };
