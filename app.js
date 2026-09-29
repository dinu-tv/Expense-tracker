

(() => {
  'use strict';

  const STORAGE_KEY = 'expensetracker_transactions_inr_v2';

  const SAMPLE_TRANSACTIONS = [
  ];

  const CATEGORY_COLORS = {
    'Food & Dining': '#f59e0b',
    'Transportation': '#3b82f6',
    'Utilities & Bills': '#8b5cf6',
    'Entertainment': '#ec4899',
    'Shopping': '#14b8a6',
    'Salary': '#10b981',
    'Freelance': '#06b6d4',
    'Other': '#64748b'
  };

  const state = {
    transactions: [],
    editingId: null,
    pendingDeleteId: null,
    chart: null,
    filters: {
      search: '',
      type: 'all',
      category: 'all',
      sortBy: 'date-desc'
    }
  };

  const DOM = {
    totalBalance: document.getElementById('total-balance'),
    balanceBadge: document.getElementById('balance-badge'),
    totalIncome: document.getElementById('total-income'),
    incomeCount: document.getElementById('income-count'),
    totalExpense: document.getElementById('total-expense'),
    expenseCount: document.getElementById('expense-count'),

    form: document.getElementById('transaction-form'),
    formTitle: document.getElementById('form-title'),
    formModeBadge: document.getElementById('form-mode-badge'),
    editingBanner: document.getElementById('editing-banner'),
    editingTxDesc: document.getElementById('editing-tx-desc'),
    bannerCancelEditBtn: document.getElementById('banner-cancel-edit-btn'),
    editIdInput: document.getElementById('edit-id'),
    descInput: document.getElementById('description'),
    amountInput: document.getElementById('amount'),
    categorySelect: document.getElementById('category'),
    dateInput: document.getElementById('date'),
    submitBtn: document.getElementById('submit-btn'),
    submitBtnText: document.getElementById('submit-btn-text'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),

    descError: document.getElementById('description-error'),
    amountError: document.getElementById('amount-error'),
    categoryError: document.getElementById('category-error'),
    dateError: document.getElementById('date-error'),

    chartCanvas: document.getElementById('expenseChart'),
    chartEmptyState: document.getElementById('chart-empty-state'),

    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    filterType: document.getElementById('filter-type'),
    filterCategory: document.getElementById('filter-category'),
    sortSelect: document.getElementById('sort-select'),
    transactionList: document.getElementById('transaction-list'),
    historyCount: document.getElementById('history-count'),
    historyEmptyState: document.getElementById('history-empty-state'),

    exportCsvBtn: document.getElementById('export-csv-btn'),
    resetDataBtn: document.getElementById('reset-data-btn'),

    deleteModal: document.getElementById('delete-modal'),
    deleteItemPreview: document.getElementById('delete-item-preview'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),

    toastContainer: document.getElementById('toast-container')
  };

  function getRelativeDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function generateId() {
    return 'tx-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
  }

  function sanitizeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message, type = 'info') {
    if (!DOM.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${sanitizeHtml(message)}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 200);
    }, 3200);
  }

  function loadTransactions() {
    try {
      const rawData = localStorage.getItem(STORAGE_KEY);
      if (rawData) {
        state.transactions = JSON.parse(rawData);
      } else {
        state.transactions = [...SAMPLE_TRANSACTIONS];
        saveTransactions();
      }
    } catch (err) {
      console.error('Failed to parse transactions from localStorage:', err);
      state.transactions = [...SAMPLE_TRANSACTIONS];
    }
  }

  function saveTransactions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
    } catch (err) {
      console.error('Failed to save transactions to localStorage:', err);
      showToast('Could not save data to browser storage', 'error');
    }
  }

  function updateFinancialOverview() {
    let incomeSum = 0;
    let expenseSum = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    state.transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        incomeSum += amt;
        incomeCount++;
      } else {
        expenseSum += amt;
        expenseCount++;
      }
    });

    const netBalance = incomeSum - expenseSum;

    DOM.totalBalance.textContent = formatCurrency(netBalance);
    DOM.totalIncome.textContent = formatCurrency(incomeSum);
    DOM.totalExpense.textContent = formatCurrency(expenseSum);

    DOM.incomeCount.textContent = `${incomeCount} transaction${incomeCount === 1 ? '' : 's'}`;
    DOM.expenseCount.textContent = `${expenseCount} transaction${expenseCount === 1 ? '' : 's'}`;

    DOM.balanceBadge.className = 'badge-status';
    if (netBalance > 0) {
      DOM.balanceBadge.classList.add('status-positive');
      DOM.balanceBadge.textContent = 'Positive Cash Flow';
      DOM.totalBalance.classList.remove('text-expense');
    } else if (netBalance < 0) {
      DOM.balanceBadge.classList.add('status-negative');
      DOM.balanceBadge.textContent = 'Net Deficit';
      DOM.totalBalance.classList.add('text-expense');
    } else {
      DOM.balanceBadge.classList.add('status-neutral');
      DOM.balanceBadge.textContent = 'Balanced (₹0.00)';
      DOM.totalBalance.classList.remove('text-expense');
    }
  }

  function updateCategoryChart() {
    if (!DOM.chartCanvas) return;

    const categoryTotals = {};
    let totalExpenseAmount = 0;

    state.transactions.forEach(tx => {
      if (tx.type === 'expense') {
        const cat = tx.category || 'Other';
        const amt = Number(tx.amount) || 0;
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
        totalExpenseAmount += amt;
      }
    });

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);

    if (labels.length === 0 || totalExpenseAmount === 0) {
      if (DOM.chartEmptyState) DOM.chartEmptyState.classList.remove('hidden');
      DOM.chartCanvas.style.display = 'none';
      if (state.chart) {
        state.chart.destroy();
        state.chart = null;
      }
      return;
    }

    if (DOM.chartEmptyState) DOM.chartEmptyState.classList.add('hidden');
    DOM.chartCanvas.style.display = 'block';

    const backgroundColors = labels.map(cat => CATEGORY_COLORS[cat] || '#64748b');

    const chartData = {
      labels: labels,
      datasets: [
        {
          data: dataValues,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }
      ]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            pointStyle: 'circle',
            font: {
              family: "'Inter', sans-serif",
              size: 11,
              weight: '500'
            },
            padding: 12
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: "'Inter', sans-serif", size: 12, weight: '600' },
          bodyFont: { family: "'Inter', sans-serif", size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function (context) {
              const val = context.raw || 0;
              const percentage = totalExpenseAmount > 0 
                ? ((val / totalExpenseAmount) * 100).toFixed(1) 
                : '0.0';
              return ` ${context.label}: ${formatCurrency(val)} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '68%',
      animation: {
        animateScale: true,
        animateRotate: true
      }
    };

    if (state.chart) {
      state.chart.data = chartData;
      state.chart.options = chartOptions;
      state.chart.update();
    } else {
      const ctx = DOM.chartCanvas.getContext('2d');
      state.chart = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: chartOptions
      });
    }
  }

  function getFilteredTransactions() {
    let list = [...state.transactions];

    const searchKeyword = state.filters.search.trim().toLowerCase();
    if (searchKeyword) {
      list = list.filter(tx => tx.description.toLowerCase().includes(searchKeyword));
    }

    if (state.filters.type !== 'all') {
      list = list.filter(tx => tx.type === state.filters.type);
    }

    if (state.filters.category !== 'all') {
      list = list.filter(tx => tx.category === state.filters.category);
    }

    list.sort((a, b) => {
      switch (state.filters.sortBy) {
        case 'date-asc':
          return new Date(a.date) - new Date(b.date);
        case 'amount-desc':
          return Number(b.amount) - Number(a.amount);
        case 'amount-asc':
          return Number(a.amount) - Number(b.amount);
        case 'date-desc':
        default:
          return new Date(b.date) - new Date(a.date) || (b.createdAt || 0) - (a.createdAt || 0);
      }
    });

    return list;
  }

  function renderTransactionTable() {
    const filtered = getFilteredTransactions();
    const totalCount = state.transactions.length;

    if (filtered.length === totalCount) {
      DOM.historyCount.textContent = `Showing all ${totalCount} transaction${totalCount === 1 ? '' : 's'}`;
    } else {
      DOM.historyCount.textContent = `Showing ${filtered.length} of ${totalCount} transaction${totalCount === 1 ? '' : 's'}`;
    }

    DOM.transactionList.innerHTML = '';

    if (filtered.length === 0) {
      DOM.historyEmptyState.classList.remove('hidden');
      const emptyTitle = document.getElementById('empty-state-title');
      const emptyDesc = document.getElementById('empty-state-desc');
      if (totalCount === 0) {
        emptyTitle.textContent = 'No transactions recorded yet';
        emptyDesc.textContent = 'Use the form to add your first income or expense transaction.';
      } else {
        emptyTitle.textContent = 'No matching transactions';
        emptyDesc.textContent = 'No transactions matched your current search and filter settings.';
      }
      return;
    }

    DOM.historyEmptyState.classList.add('hidden');

    const fragment = document.createDocumentFragment();

    filtered.forEach(tx => {
      const tr = document.createElement('tr');
      tr.dataset.id = tx.id;

      const isEditingThisRow = state.editingId === tx.id;
      if (isEditingThisRow) {
        tr.classList.add('table-row-editing');
      }

      const isIncome = tx.type === 'income';
      const amountPrefix = isIncome ? '+' : '-';
      const amountClass = isIncome ? 'text-income' : 'text-expense';
      const typeBadgeClass = isIncome ? 'badge-income' : 'badge-expense';

      tr.innerHTML = `
        <td data-label="Date" class="table-date">${formatDate(tx.date)}</td>
        <td data-label="Description" class="table-desc" title="${sanitizeHtml(tx.description)}">
          ${sanitizeHtml(tx.description)}
          ${isEditingThisRow ? '<span class="badge badge-edit" style="margin-left:6px; font-size:0.65rem; padding: 0.1rem 0.4rem;">Editing</span>' : ''}
        </td>
        <td data-label="Category">
          <span class="badge badge-category">${sanitizeHtml(tx.category)}</span>
        </td>
        <td data-label="Type">
          <span class="badge ${typeBadgeClass}">${isIncome ? 'Income' : 'Expense'}</span>
        </td>
        <td data-label="Amount" class="table-amount text-right ${amountClass}">
          ${amountPrefix}${formatCurrency(tx.amount)}
        </td>
        <td data-label="Actions" class="table-actions text-center">
          <div class="row-actions">
            <button type="button" class="btn-action btn-action-edit" data-action="edit" data-id="${tx.id}" title="Edit this transaction">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Edit</span>
            </button>
            <button type="button" class="btn-action btn-action-delete" data-action="delete" data-id="${tx.id}" title="Delete this transaction">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </td>
      `;

      fragment.appendChild(tr);
    });

    DOM.transactionList.appendChild(fragment);
  }

  function clearErrors() {
    DOM.descError.textContent = '';
    DOM.amountError.textContent = '';
    DOM.categoryError.textContent = '';
    DOM.dateError.textContent = '';

    DOM.descInput.classList.remove('is-invalid');
    DOM.amountInput.classList.remove('is-invalid');
    DOM.categorySelect.classList.remove('is-invalid');
    DOM.dateInput.classList.remove('is-invalid');
  }

  function validateForm() {
    clearErrors();
    let isValid = true;

    const descVal = DOM.descInput.value.trim();
    if (!descVal) {
      DOM.descError.textContent = 'Please enter a transaction description.';
      DOM.descInput.classList.add('is-invalid');
      isValid = false;
    } else if (descVal.length < 2) {
      DOM.descError.textContent = 'Description must be at least 2 characters.';
      DOM.descInput.classList.add('is-invalid');
      isValid = false;
    }

    const amountVal = parseFloat(DOM.amountInput.value);
    if (isNaN(amountVal) || DOM.amountInput.value.trim() === '') {
      DOM.amountError.textContent = 'Please enter a valid amount.';
      DOM.amountInput.classList.add('is-invalid');
      isValid = false;
    } else if (amountVal <= 0) {
      DOM.amountError.textContent = 'Amount must be greater than zero.';
      DOM.amountInput.classList.add('is-invalid');
      isValid = false;
    }

    const categoryVal = DOM.categorySelect.value;
    if (!categoryVal) {
      DOM.categoryError.textContent = 'Please select a category.';
      DOM.categorySelect.classList.add('is-invalid');
      isValid = false;
    }

    const dateVal = DOM.dateInput.value;
    if (!dateVal) {
      DOM.dateError.textContent = 'Please pick a valid date.';
      DOM.dateInput.classList.add('is-invalid');
      isValid = false;
    }

    return isValid;
  }

  function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const typeRadio = document.querySelector('input[name="transaction-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'expense';
    const description = DOM.descInput.value.trim();
    const amount = parseFloat(DOM.amountInput.value);
    const category = DOM.categorySelect.value;
    const date = DOM.dateInput.value;

    if (state.editingId) {
      const index = state.transactions.findIndex(t => t.id === state.editingId);
      if (index !== -1) {
        state.transactions[index] = {
          ...state.transactions[index],
          type,
          description,
          amount,
          category,
          date
        };
        saveTransactions();
        showToast('Transaction updated successfully', 'success');
      }
      resetFormMode();
    } else {
      const newTx = {
        id: generateId(),
        type,
        description,
        amount,
        category,
        date,
        createdAt: Date.now()
      };
      state.transactions.unshift(newTx);
      saveTransactions();
      showToast('Transaction added successfully', 'success');
      resetFormFields();
    }

    updateFinancialOverview();
    updateCategoryChart();
    renderTransactionTable();
  }

  function startEditTransaction(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    state.editingId = id;
    DOM.editIdInput.value = id;

    DOM.formTitle.textContent = 'Edit Transaction';
    DOM.formModeBadge.textContent = 'Editing Mode';
    DOM.formModeBadge.className = 'badge badge-edit';
    DOM.submitBtnText.textContent = 'Save Changes';
    DOM.cancelEditBtn.classList.remove('hidden');

    if (DOM.editingBanner) {
      DOM.editingBanner.classList.remove('hidden');
      if (DOM.editingTxDesc) {
        DOM.editingTxDesc.textContent = `"${tx.description}" (${formatCurrency(tx.amount)})`;
      }
    }

    const typeRadio = document.querySelector(`input[name="transaction-type"][value="${tx.type}"]`);
    if (typeRadio) typeRadio.checked = true;

    DOM.descInput.value = tx.description;
    DOM.amountInput.value = tx.amount;
    DOM.categorySelect.value = tx.category;
    DOM.dateInput.value = tx.date;

    clearErrors();

    renderTransactionTable();

    DOM.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    DOM.descInput.focus();
  }

  function resetFormMode() {
    state.editingId = null;
    DOM.editIdInput.value = '';
    DOM.formTitle.textContent = 'Add New Transaction';
    DOM.formModeBadge.textContent = 'New';
    DOM.formModeBadge.className = 'badge badge-primary';
    DOM.submitBtnText.textContent = 'Add Transaction';
    DOM.cancelEditBtn.classList.add('hidden');
    if (DOM.editingBanner) {
      DOM.editingBanner.classList.add('hidden');
    }
    resetFormFields();
    renderTransactionTable();
  }

  function resetFormFields() {
    clearErrors();
    DOM.form.reset();
    setDefaultDate();
    const expenseRadio = document.querySelector('input[name="transaction-type"][value="expense"]');
    if (expenseRadio) expenseRadio.checked = true;
  }

  function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    DOM.dateInput.value = today;
  }

  function promptDeleteTransaction(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    state.pendingDeleteId = id;

    const isIncome = tx.type === 'income';
    DOM.deleteItemPreview.innerHTML = `
      <div style="text-align:left;">
        <div style="font-weight:600; color: #0f172a; font-size:0.95rem;">${sanitizeHtml(tx.description)}</div>
        <div style="font-size:0.75rem; color:#64748b; margin-top:3px;">
          ${sanitizeHtml(tx.category)} • ${formatDate(tx.date)}
        </div>
      </div>
      <div class="${isIncome ? 'text-income' : 'text-expense'}" style="font-weight:700; font-size:1.1rem;">
        ${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}
      </div>
    `;

    if (DOM.deleteModal && typeof DOM.deleteModal.showModal === 'function') {
      try {
        DOM.deleteModal.showModal();
        return;
      } catch (err) {
        console.warn('showModal error, falling back to confirm', err);
      }
    }

    if (confirm(`Are you sure you want to delete "${tx.description}" (${formatCurrency(tx.amount)})?`)) {
      confirmDeleteTransaction();
    }
  }

  function closeDeleteModal() {
    state.pendingDeleteId = null;
    if (DOM.deleteModal.open) {
      DOM.deleteModal.close();
    }
  }

  function confirmDeleteTransaction() {
    if (!state.pendingDeleteId) return;

    const id = state.pendingDeleteId;
    const targetTx = state.transactions.find(t => t.id === id);
    const txName = targetTx ? targetTx.description : 'Transaction';

    state.transactions = state.transactions.filter(t => t.id !== id);
    saveTransactions();

    if (state.editingId === id) {
      resetFormMode();
    }

    closeDeleteModal();
    updateFinancialOverview();
    updateCategoryChart();
    renderTransactionTable();
    showToast(`Deleted "${txName}"`, 'info');
  }

  function exportToCsv() {
    if (state.transactions.length === 0) {
      showToast('No transactions to export', 'error');
      return;
    }

    const headers = ['ID', 'Date', 'Type', 'Category', 'Description', 'Amount'];
    const rows = state.transactions.map(tx => [
      `"${tx.id}"`,
      `"${tx.date}"`,
      `"${tx.type}"`,
      `"${tx.category.replace(/"/g, '""')}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.amount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ExpenseTracker_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Transactions exported to CSV', 'success');
  }

  function resetDemoData() {
    if (confirm('Reset all transactions back to default demo data? Your current transactions will be replaced.')) {
      state.transactions = JSON.parse(JSON.stringify(SAMPLE_TRANSACTIONS));
      saveTransactions();
      resetFormMode();
      updateFinancialOverview();
      updateCategoryChart();
      renderTransactionTable();
      showToast('Reset to demo transactions', 'info');
    }
  }

  function setupEventListeners() {
    DOM.form.addEventListener('submit', handleFormSubmit);

    DOM.cancelEditBtn.addEventListener('click', resetFormMode);

    ['input', 'change'].forEach(evtType => {
      DOM.descInput.addEventListener(evtType, () => {
        DOM.descError.textContent = '';
        DOM.descInput.classList.remove('is-invalid');
      });
      DOM.amountInput.addEventListener(evtType, () => {
        DOM.amountError.textContent = '';
        DOM.amountInput.classList.remove('is-invalid');
      });
      DOM.categorySelect.addEventListener(evtType, () => {
        DOM.categoryError.textContent = '';
        DOM.categorySelect.classList.remove('is-invalid');
      });
      DOM.dateInput.addEventListener(evtType, () => {
        DOM.dateError.textContent = '';
        DOM.dateInput.classList.remove('is-invalid');
      });
    });

    DOM.transactionList.addEventListener('click', e => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;

      const action = button.dataset.action;
      const id = button.dataset.id;

      if (action === 'edit') {
        startEditTransaction(id);
      } else if (action === 'delete') {
        promptDeleteTransaction(id);
      }
    });

    DOM.cancelDeleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      closeDeleteModal();
    });

    DOM.confirmDeleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      confirmDeleteTransaction();
    });

    if (DOM.bannerCancelEditBtn) {
      DOM.bannerCancelEditBtn.addEventListener('click', resetFormMode);
    }

    DOM.deleteModal.addEventListener('click', e => {
      const rect = DOM.deleteModal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        closeDeleteModal();
      }
    });

    DOM.searchInput.addEventListener('input', e => {
      state.filters.search = e.target.value;
      if (e.target.value.length > 0) {
        DOM.clearSearchBtn.classList.remove('hidden');
      } else {
        DOM.clearSearchBtn.classList.add('hidden');
      }
      renderTransactionTable();
    });

    DOM.clearSearchBtn.addEventListener('click', () => {
      DOM.searchInput.value = '';
      state.filters.search = '';
      DOM.clearSearchBtn.classList.add('hidden');
      DOM.searchInput.focus();
      renderTransactionTable();
    });

    DOM.filterType.addEventListener('change', e => {
      state.filters.type = e.target.value;
      renderTransactionTable();
    });

    DOM.filterCategory.addEventListener('change', e => {
      state.filters.category = e.target.value;
      renderTransactionTable();
    });

    DOM.sortSelect.addEventListener('change', e => {
      state.filters.sortBy = e.target.value;
      renderTransactionTable();
    });

    DOM.exportCsvBtn.addEventListener('click', exportToCsv);
		if (DOM.resetDataBtn) {
			DOM.resetDataBtn.addEventListener('click', resetDemoData);
		}
  }

  function init() {
    setDefaultDate();
    loadTransactions();
    updateFinancialOverview();
    updateCategoryChart();
    renderTransactionTable();
    setupEventListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();