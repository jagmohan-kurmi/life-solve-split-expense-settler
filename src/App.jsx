import { useMemo, useState } from 'react';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

const defaultMembers = ['Amit', 'Neha', 'Rohan'];
const defaultExpenses = [
  { id: 1, description: 'Hotel', payer: 'Amit', amount: 3600, splitType: 'equal' },
  { id: 2, description: 'Dinner', payer: 'Neha', amount: 2400, splitType: 'exact', shares: { Amit: 900, Neha: 800, Rohan: 700 } },
  { id: 3, description: 'Cab', payer: 'Rohan', amount: 1800, splitType: 'percentage', shares: { Amit: 30, Neha: 30, Rohan: 40 } },
];

function buildBalances(members, expenses) {
  const result = Object.fromEntries(members.map((member) => [member, 0]));
  expenses.forEach((expense) => {
    const amount = Number(expense.amount || 0);
    result[expense.payer] += amount;
    if (expense.splitType === 'equal') {
      const share = amount / members.length;
      members.forEach((member) => {
        result[member] -= share;
      });
      return;
    }
    if (expense.splitType === 'exact') {
      members.forEach((member) => {
        result[member] -= Number(expense.shares?.[member] || 0);
      });
      return;
    }
    members.forEach((member) => {
      result[member] -= (amount * Number(expense.shares?.[member] || 0)) / 100;
    });
  });
  return result;
}

function settleBalances(members, expenses) {
  const balances = buildBalances(members, expenses);
  const debtors = Object.entries(balances)
    .filter(([, value]) => value < 0)
    .map(([member, amount]) => ({ member, amount: Math.abs(amount) }));
  const creditors = Object.entries(balances)
    .filter(([, value]) => value > 0)
    .map(([member, amount]) => ({ member, amount }));

  const transactions = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0.01) {
      transactions.push({ from: debtor.member, to: creditor.member, amount });
    }
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount < 0.01) i += 1;
    if (creditor.amount < 0.01) j += 1;
  }
  return transactions;
}

export default function App() {
  const [members, setMembers] = useState(defaultMembers);
  const [expenses, setExpenses] = useState(defaultExpenses);
  const [memberInput, setMemberInput] = useState('');
  const [entry, setEntry] = useState({ description: '', amount: '', payer: defaultMembers[0], splitType: 'equal' });

  const balances = useMemo(() => buildBalances(members, expenses), [members, expenses]);
  const settlement = useMemo(() => settleBalances(members, expenses), [members, expenses]);

  const addMember = () => {
    const clean = memberInput.trim();
    if (!clean || members.includes(clean)) return;
    setMembers((current) => [...current, clean]);
    setMemberInput('');
  };

  const addExpense = () => {
    if (!entry.description || !entry.amount) return;
    let shares = {};
    if (entry.splitType !== 'equal') {
      members.forEach((member) => {
        const raw = window.prompt(`${entry.splitType === 'exact' ? 'Exact amount' : 'Percentage'} for ${member}?`, entry.splitType === 'exact' ? '0' : '0');
        shares[member] = Number(raw || 0);
      });
    }

    const amount = Number(entry.amount);
    setExpenses((current) => [
      ...current,
      { id: Date.now(), description: entry.description, payer: entry.payer, amount, splitType: entry.splitType, shares },
    ]);
    setEntry({ description: '', amount: '', payer: members[0] || '', splitType: 'equal' });
  };

  return (
    <div className="app-shell">
      <div className="panel hero-panel">
        <div>
          <p className="eyebrow">Trip & roommate billing</p>
          <h1>Smart Split Settler</h1>
        </div>
        <div className="form-grid two-columns">
          <input value={memberInput} onChange={(e) => setMemberInput(e.target.value)} placeholder="Add member" />
          <button onClick={addMember}>Add Member</button>
        </div>
        <div className="tag-row">
          {members.map((member) => <span key={member} className="tag">{member}</span>)}
        </div>
      </div>

      <div className="panel">
        <h2>Log expense</h2>
        <div className="form-grid two-columns">
          <input value={entry.description} onChange={(e) => setEntry({ ...entry, description: e.target.value })} placeholder="Expense name" />
          <input type="number" value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} placeholder="Amount" />
          <select value={entry.payer} onChange={(e) => setEntry({ ...entry, payer: e.target.value })}>
            {members.map((member) => <option key={member} value={member}>{member}</option>)}
          </select>
          <select value={entry.splitType} onChange={(e) => setEntry({ ...entry, splitType: e.target.value })}>
            <option value="equal">Equal split</option>
            <option value="exact">Exact amounts</option>
            <option value="percentage">Percentage split</option>
          </select>
        </div>
        <button className="primary" onClick={addExpense}>Add Expense</button>
      </div>

      <div className="panel">
        <h2>Net balances</h2>
        {members.map((member) => (
          <div key={member} className="balance-row">
            <span>{member}</span>
            <strong className={balances[member] >= 0 ? 'positive' : 'negative'}>{money(balances[member])}</strong>
          </div>
        ))}
      </div>

      <div className="panel full-span">
        <h2>Minimum settlement</h2>
        {settlement.length ? (
          settlement.map((transaction, index) => (
            <div key={`${transaction.from}-${transaction.to}-${index}`} className="balance-row">
              <span>{transaction.from} owes {transaction.to}</span>
              <strong>{money(transaction.amount)}</strong>
            </div>
          ))
        ) : (
          <p className="muted">All balances are settled.</p>
        )}
      </div>
    </div>
  );
}
