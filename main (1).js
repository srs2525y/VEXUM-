// 支出データを管理するクラス
class ExpenseManager {
    constructor() {
        this.expenses = this.loadExpenses();
        this.categories = ['食費', '交通費', '娯楽費', 'その他'];
    }

    // localStorageからデータを読み込み
    loadExpenses() {
        const data = localStorage.getItem('expenses');
        return data ? JSON.parse(data) : [];
    }

    // localStorageにデータを保存
    saveExpenses() {
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
    }

    // 新しい支出を追加
    addExpense(date, category, amount, memo) {
        const expense = {
            id: Date.now(),
            date: date,
            category: category,
            amount: parseInt(amount),
            memo: memo || ''
        };
        this.expenses.unshift(expense); // 新しい順に追加
        this.saveExpenses();
        return expense;
    }

    // 支出を削除
    deleteExpense(id) {
        this.expenses = this.expenses.filter(expense => expense.id !== id);
        this.saveExpenses();
    }

    // カテゴリ別の合計を計算
    getCategorySummary() {
        const summary = {};
        this.categories.forEach(category => {
            summary[category] = this.expenses
                .filter(expense => expense.category === category)
                .reduce((sum, expense) => sum + expense.amount, 0);
        });
        return summary;
    }

    // 全支出の合計を計算
    getTotalAmount() {
        return this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    }

    // CSV形式の文字列を生成
    generateCSV() {
        if (this.expenses.length === 0) {
            return '日付,カテゴリ,金額,メモ';
        }

        const header = '日付,カテゴリ,金額,メモ';
        const rows = this.expenses
            .sort((a, b) => new Date(a.date) - new Date(b.date)) // 日付順にソート
            .map(expense => {
                const memo = expense.memo.replace(/,/g, '、'); // カンマをエスケープ
                return `${expense.date},${expense.category},${expense.amount},${memo}`;
            });
        
        return [header, ...rows].join('\n');
    }
}

// UI管理クラス
class UI {
    constructor(manager) {
        this.manager = manager;
        this.form = document.getElementById('expense-form');
        this.dateInput = document.getElementById('date');
        this.categoryInput = document.getElementById('category');
        this.amountInput = document.getElementById('amount');
        this.memoInput = document.getElementById('memo');
        this.expenseList = document.getElementById('expense-list');
        this.copyCsvBtn = document.getElementById('copy-csv-btn');

        this.init();
    }

    init() {
        // 今日の日付をデフォルトに設定
        this.dateInput.value = new Date().toISOString().split('T')[0];

        // イベントリスナーを設定
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.copyCsvBtn.addEventListener('click', () => this.copyToClipboard());

        // 初期表示
        this.render();
    }

    handleSubmit(e) {
        e.preventDefault();

        const date = this.dateInput.value;
        const category = this.categoryInput.value;
        const amount = this.amountInput.value;
        const memo = this.memoInput.value;

        // 支出を追加
        this.manager.addExpense(date, category, amount, memo);

        // フォームをリセット
        this.memoInput.value = '';
        this.amountInput.value = '';
        this.dateInput.value = new Date().toISOString().split('T')[0];

        // 表示を更新
        this.render();

        // フォームの最初の入力欄にフォーカス
        this.dateInput.focus();
    }

    render() {
        this.renderExpenseList();
        this.renderSummary();
    }

    renderExpenseList() {
        if (this.manager.expenses.length === 0) {
            this.expenseList.innerHTML = '<p class="empty-message">支出データがありません</p>';
            return;
        }

        this.expenseList.innerHTML = this.manager.expenses
            .map(expense => this.createExpenseItemHTML(expense))
            .join('');

        // 削除ボタンのイベントリスナーを設定
        this.expenseList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.deleteExpense(id);
            });
        });
    }

    createExpenseItemHTML(expense) {
        return `
            <div class="expense-item">
                <div class="expense-date">${this.formatDate(expense.date)}</div>
                <div class="expense-details">
                    <span class="expense-category">${expense.category}</span>
                    ${expense.memo ? `<div class="expense-memo">${this.escapeHtml(expense.memo)}</div>` : ''}
                </div>
                <div class="expense-amount">¥${this.formatNumber(expense.amount)}</div>
                <button class="delete-btn" data-id="${expense.id}" title="削除">✕</button>
            </div>
        `;
    }

    deleteExpense(id) {
        if (confirm('この支出を削除しますか?')) {
            this.manager.deleteExpense(id);
            this.render();
        }
    }

    renderSummary() {
        const summary = this.manager.getCategorySummary();
        const total = this.manager.getTotalAmount();

        // カテゴリ別の合計を表示
        Object.keys(summary).forEach(category => {
            const element = document.getElementById(`summary-${category}`);
            if (element) {
                element.textContent = `¥${this.formatNumber(summary[category])}`;
            }
        });

        // 全体の合計を表示
        document.getElementById('total-amount').textContent = `¥${this.formatNumber(total)}`;
    }

    async copyToClipboard() {
        const csv = this.manager.generateCSV();
        
        try {
            await navigator.clipboard.writeText(csv);
            this.showNotification('CSVをクリップボードにコピーしました');
        } catch (err) {
            // フォールバック方式
            const textarea = document.createElement('textarea');
            textarea.value = csv;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                this.showNotification('CSVをクリップボードにコピーしました');
            } catch (err) {
                this.showNotification('コピーに失敗しました', true);
            }
            
            document.body.removeChild(textarea);
        }
    }

    showNotification(message, isError = false) {
        // 既存の通知を削除
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${isError ? '#e74c3c' : '#27ae60'};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }

    formatNumber(num) {
        return num.toLocaleString('ja-JP');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// アニメーション用のCSSを追加
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    const manager = new ExpenseManager();
    const ui = new UI(manager);
});
