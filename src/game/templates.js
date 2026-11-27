// Question templates.
//
// Each template says which dataset it uses, how hard it is, and how to build
// one concrete question from the random data. `build` returns:
//   { prompt, sql, ordered }
// where `sql` is the reference answer. The reference answer is run on the
// generated data to get the expected result, so any query that returns the same
// result is accepted - not only the exact wording of the reference.
//
// To add a question type: add an object to TEMPLATES. That's it.

import { ORDER_STATUSES } from './datasets.js';

const col = (table, name) => table.columns.findIndex((c) => c.name === name);
const T = (tables, name) => tables.find((t) => t.name === name);

export const TEMPLATES = [
  // ---------------------------------------------------------------- level 1
  {
    id: 'students_by_city',
    title: 'Students from one city',
    theme: 'students',
    difficulty: 1,
    concepts: ['SELECT', 'WHERE', 'ORDER BY'],
    build(rng, tables) {
      const t = T(tables, 'students');
      const city = rng.pick(t.rows)[col(t, 'city')];
      return {
        prompt: `List the name and grade of every student from ${city}, highest grade first (break ties by name).`,
        sql: `SELECT name, grade FROM students WHERE city = '${city}' ORDER BY grade DESC, name`,
        ordered: true,
      };
    },
  },
  {
    id: 'students_count_grade',
    title: 'Count high grades',
    theme: 'students',
    difficulty: 1,
    concepts: ['COUNT', 'WHERE'],
    build(rng, tables) {
      const t = T(tables, 'students');
      const g = rng.pick(t.rows)[col(t, 'grade')];
      return {
        prompt: `How many students have a grade of ${g} or higher?`,
        sql: `SELECT COUNT(*) AS total FROM students WHERE grade >= ${g}`,
        ordered: false,
      };
    },
  },
  {
    id: 'students_top_n',
    title: 'Top students',
    theme: 'students',
    difficulty: 1,
    concepts: ['ORDER BY', 'LIMIT'],
    build(rng) {
      const n = rng.int(3, 5);
      return {
        prompt: `Show the name and grade of the top ${n} students by grade (highest first; break ties by name).`,
        sql: `SELECT name, grade FROM students ORDER BY grade DESC, name LIMIT ${n}`,
        ordered: true,
      };
    },
  },
  {
    id: 'shop_status_filter',
    title: 'Big orders by status',
    theme: 'shop',
    difficulty: 1,
    concepts: ['WHERE', 'AND', 'ORDER BY'],
    build(rng) {
      const status = rng.pick(ORDER_STATUSES);
      const amt = rng.pick([300, 500, 800, 1000]);
      return {
        prompt: `List the id and amount of every order with status '${status}' and an amount above ${amt}, biggest amount first (break ties by id).`,
        sql: `SELECT id, amount FROM orders WHERE status = '${status}' AND amount > ${amt} ORDER BY amount DESC, id`,
        ordered: true,
      };
    },
  },

  // ---------------------------------------------------------------- level 2
  {
    id: 'students_avg_city',
    title: 'Average grade per city',
    theme: 'students',
    difficulty: 2,
    concepts: ['GROUP BY', 'AVG', 'ROUND'],
    build() {
      return {
        prompt:
          'For each city show the city and the average grade rounded to 1 decimal place. Highest average first (break ties by city).',
        sql: `SELECT city, ROUND(AVG(grade), 1) AS avg_grade FROM students GROUP BY city ORDER BY avg_grade DESC, city`,
        ordered: true,
      };
    },
  },
  {
    id: 'students_course_count',
    title: 'Popular courses',
    theme: 'students',
    difficulty: 2,
    concepts: ['GROUP BY', 'HAVING', 'COUNT'],
    build(rng, tables) {
      const t = T(tables, 'students');
      const counts = {};
      for (const r of t.rows) counts[r[col(t, 'course')]] = (counts[r[col(t, 'course')]] || 0) + 1;
      const max = Math.max(...Object.values(counts));
      const k = rng.int(2, Math.max(2, max));
      return {
        prompt: `Show each course and its number of students, but only courses with at least ${k} students. Most students first (break ties by course).`,
        sql: `SELECT course, COUNT(*) AS total FROM students GROUP BY course HAVING COUNT(*) >= ${k} ORDER BY total DESC, course`,
        ordered: true,
      };
    },
  },
  {
    id: 'students_age_between',
    title: 'Students in an age range',
    theme: 'students',
    difficulty: 2,
    concepts: ['BETWEEN', 'ORDER BY'],
    build(rng) {
      const a = rng.int(18, 20);
      const b = a + rng.int(1, 3);
      return {
        prompt: `List the name and age of students aged between ${a} and ${b} (both included), youngest first (break ties by name).`,
        sql: `SELECT name, age FROM students WHERE age BETWEEN ${a} AND ${b} ORDER BY age, name`,
        ordered: true,
      };
    },
  },
  {
    id: 'shop_total_by_status',
    title: 'Money by order status',
    theme: 'shop',
    difficulty: 2,
    concepts: ['GROUP BY', 'SUM'],
    build() {
      return {
        prompt:
          'For each order status show the status and the total amount of its orders. Biggest total first (break ties by status).',
        sql: `SELECT status, SUM(amount) AS total FROM orders GROUP BY status ORDER BY total DESC, status`,
        ordered: true,
      };
    },
  },
  {
    id: 'company_dept_avg',
    title: 'Average salary per department',
    theme: 'company',
    difficulty: 2,
    concepts: ['JOIN', 'GROUP BY', 'AVG'],
    build() {
      return {
        prompt:
          'For each department show its name and the average salary rounded to a whole number. Highest average first (break ties by department name).',
        sql: `SELECT d.name AS department, ROUND(AVG(e.salary)) AS avg_salary FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name ORDER BY avg_salary DESC, d.name`,
        ordered: true,
      };
    },
  },

  // ---------------------------------------------------------------- level 3
  {
    id: 'shop_customer_spend',
    title: 'What each customer paid',
    theme: 'shop',
    difficulty: 3,
    concepts: ['JOIN', 'GROUP BY', 'SUM'],
    build() {
      return {
        prompt:
          "Show each customer's name and the total amount of their 'paid' orders (only customers with at least one paid order). Biggest total first (break ties by name).",
        sql: `SELECT c.name, SUM(o.amount) AS total FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' GROUP BY c.id, c.name ORDER BY total DESC, c.name`,
        ordered: true,
      };
    },
  },
  {
    id: 'shop_no_orders',
    title: 'Customers who never ordered',
    theme: 'shop',
    difficulty: 3,
    concepts: ['LEFT JOIN', 'IS NULL'],
    build() {
      return {
        prompt: 'List the names of customers who have never placed an order, in alphabetical order.',
        sql: `SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL ORDER BY c.name`,
        ordered: true,
      };
    },
  },
  {
    id: 'shop_repeat_customers',
    title: 'Repeat customers',
    theme: 'shop',
    difficulty: 3,
    concepts: ['JOIN', 'GROUP BY', 'HAVING'],
    build(rng) {
      const k = rng.int(3, 4);
      return {
        prompt: `Show the name and number of orders of customers who placed at least ${k} orders. Most orders first (break ties by name).`,
        sql: `SELECT c.name, COUNT(*) AS order_count FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.id, c.name HAVING COUNT(*) >= ${k} ORDER BY order_count DESC, c.name`,
        ordered: true,
      };
    },
  },
  {
    id: 'company_recent_hires',
    title: 'Recent hires with department',
    theme: 'company',
    difficulty: 3,
    concepts: ['JOIN', 'WHERE', 'ORDER BY'],
    build(rng) {
      const y = rng.int(2018, 2023);
      return {
        prompt: `List each employee hired in ${y} or later with their department name (columns: employee, department), in alphabetical order of employee.`,
        sql: `SELECT e.name AS employee, d.name AS department FROM employees e JOIN departments d ON d.id = e.dept_id WHERE e.hire_year >= ${y} ORDER BY e.name`,
        ordered: true,
      };
    },
  },

  // ---------------------------------------------------------------- level 4
  {
    id: 'shop_above_avg',
    title: 'Above-average orders',
    theme: 'shop',
    difficulty: 4,
    concepts: ['Subquery', 'AVG'],
    build() {
      return {
        prompt:
          'List the id and amount of every order whose amount is greater than the average order amount. Biggest amount first (break ties by id).',
        sql: `SELECT id, amount FROM orders WHERE amount > (SELECT AVG(amount) FROM orders) ORDER BY amount DESC, id`,
        ordered: true,
      };
    },
  },
  {
    id: 'company_above_dept_avg',
    title: 'Paid above their department average',
    theme: 'company',
    difficulty: 4,
    concepts: ['Correlated subquery', 'AVG'],
    build() {
      return {
        prompt:
          "List the name and salary of employees who earn more than the average salary of their own department. Highest salary first (break ties by name).",
        sql: `SELECT e.name, e.salary FROM employees e WHERE e.salary > (SELECT AVG(salary) FROM employees WHERE dept_id = e.dept_id) ORDER BY e.salary DESC, e.name`,
        ordered: true,
      };
    },
  },
  {
    id: 'company_salary_rank',
    title: 'Salary rank inside each department',
    theme: 'company',
    difficulty: 4,
    concepts: ['Window function', 'RANK', 'JOIN'],
    build() {
      return {
        prompt:
          'For every employee show name, department name, salary, and salary rank inside their department (1 = highest paid, use RANK()). Order by department name, then rank, then employee name.',
        sql: `SELECT e.name, d.name AS department, e.salary, RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS salary_rank FROM employees e JOIN departments d ON d.id = e.dept_id ORDER BY d.name, salary_rank, e.name`,
        ordered: true,
      };
    },
  },
];
