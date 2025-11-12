document.addEventListener('DOMContentLoaded', () => {

    // ----- CÀI ĐẶT API TELEGRAM -----
    const TELEGRAM_BOT_TOKEN = '7696765215:AAFpmqj1rD34uEgrho3T-97wnTeZcxJeWlo';
    const TELEGRAM_CHAT_ID = '6369371709';

    // ----- DỮ LIỆU TÀI KHOẢN NGÂN HÀNG -----
    const accountsData = {
        'mb_main': {
            bankCode: 'MB',
            bankName: 'MB BANK - TÀI KHOẢN CHÍNH',
            iconClass: 'fa-solid fa-building-columns', // Icon chung
            colorClass: 'bank-icon', // Class màu
            number: '090695',
            owner: 'NGUYEN HOANG VINH'
        },
        'mb_sub': {
            bankCode: 'MB',
            bankName: 'MB BANK - TÀI KHOẢN 2',
            iconClass: 'fa-solid fa-building-columns',
            colorClass: 'bank-icon',
            number: '596783',
            owner: 'NGUYEN HOANG VINH'
        },
        'zalo': {
            bankCode: 'ZALOPAY',
            bankName: 'ZALO PAY',
            iconClass: 'fa-solid fa-wallet',
            colorClass: 'wallet-icon-zalo',
            number: '0397772987',
            owner: 'NGUYEN HOANG VINH'
        }
    };

    // ----- BIẾN TRẠNG THÁI (STATE) -----
    let state = {
        currentStep: 1,
        paymentType: 'Locket Gold',
        amount: 30000,
        isCustom: false,
        selectedAccountKey: 'mb_main', // Mặc định
        transactionId: '',
        transactionTime: ''
    };

    // ----- BỘ CHỌN DOM -----
    const steps = document.querySelectorAll('.step');
    const stepItems = document.querySelectorAll('.step-item');
    
    // Bước 1
    const optionsContainer = document.getElementById('payment-options-container');
    const optionCards = optionsContainer.querySelectorAll('.option-card');
    const customAmountGroup = document.getElementById('custom-amount-group');
    const customAmountInput = document.getElementById('custom-amount');
    const step1Error = document.getElementById('step1-error');
    const step1NextBtn = document.getElementById('step1-next');

    // Bước 2
    const accountListContainer = document.getElementById('account-list-container');
    const step2Error = document.getElementById('step2-error');
    const step2BackBtn = document.getElementById('step2-back');
    const step2NextBtn = document.getElementById('step2-next');

    // Bước 3
    const step3BackBtn = document.getElementById('step3-back');
    const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
    const copyStkBtn = document.getElementById('copy-stk-btn');
    const copyMemoBtn = document.getElementById('copy-memo-btn');
    
    // ----- HÀM TIỆN ÍCH -----

    const formatCurrency = (number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);

    const showToast = (message) => {
        const toast = document.getElementById('toast-notification');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    };

    const copyToClipboard = (text, message) => {
        navigator.clipboard.writeText(text).then(() => {
            showToast(message);
        }).catch(err => {
            console.error('Không thể sao chép: ', err);
            showToast('Lỗi khi sao chép!');
        });
    };

    const generateTransactionId = () => `HV${new Date().getTime().toString().slice(-7)}`;
    const getTransactionTime = () => new Date().toLocaleString('vi-VN', { hour12: false });

    const navigateToStep = (stepNumber) => {
        state.currentStep = stepNumber;
        
        steps.forEach(step => {
            step.classList.remove('active');
            if (parseInt(step.dataset.step) === stepNumber) {
                step.classList.add('active');
            }
        });

        stepItems.forEach(item => {
            const itemStep = parseInt(item.dataset.step);
            item.classList.remove('active', 'completed');
            if (itemStep < stepNumber) {
                item.classList.add('completed');
            } else if (itemStep === stepNumber) {
                item.classList.add('active');
            }
        });
    };

    // ----- LOGIC BƯỚC 1: CHỌN THANH TOÁN -----
    optionsContainer.addEventListener('click', (e) => {
        const clickedCard = e.target.closest('.option-card');
        if (!clickedCard) return;

        optionCards.forEach(card => card.classList.remove('active'));
        clickedCard.classList.add('active');

        state.paymentType = clickedCard.dataset.type;
        state.amount = parseInt(clickedCard.dataset.amount);
        state.isCustom = clickedCard.dataset.custom === 'true';

        if (state.isCustom) {
            customAmountGroup.classList.remove('hidden');
            customAmountInput.value = '';
            state.amount = 0;
            step1Error.textContent = '';
        } else {
            customAmountGroup.classList.add('hidden');
            step1Error.textContent = '';
        }
    });

    step1NextBtn.addEventListener('click', () => {
        if (state.isCustom) {
            const amount = parseInt(customAmountInput.value);
            if (isNaN(amount) || amount <= 0) {
                step1Error.textContent = 'Vui lòng nhập số tiền hợp lệ (lớn hơn 0).';
                return;
            }
            state.amount = amount;
        }
        step1Error.textContent = '';
        navigateToStep(2);
    });

    // ----- LOGIC BƯỚC 2: CHỌN TÀI KHOẢN -----
    accountListContainer.addEventListener('change', () => {
        const selectedRadio = document.querySelector('input[name="bank-account"]:checked');
        if (selectedRadio) {
            state.selectedAccountKey = selectedRadio.value;
            step2Error.textContent = '';
        }
    });

    step2BackBtn.addEventListener('click', () => navigateToStep(1));

    step2NextBtn.addEventListener('click', () => {
        if (!state.selectedAccountKey || !accountsData[state.selectedAccountKey]) {
            step2Error.textContent = 'Vui lòng chọn một tài khoản hợp lệ.';
            return;
        }
        step2Error.textContent = '';
        generateReceipt();
        navigateToStep(3);
    });

    // ----- LOGIC BƯỚC 3: HÓA ĐƠN -----
    const generateReceipt = () => {
        state.transactionId = generateTransactionId();
        state.transactionTime = getTransactionTime();
        const account = accountsData[state.selectedAccountKey];

        document.getElementById('receipt-txn-id').textContent = state.transactionId;
        document.getElementById('receipt-time').textContent = state.transactionTime;
        document.getElementById('receipt-type').textContent = state.paymentType;
        document.getElementById('receipt-amount').textContent = formatCurrency(state.amount);

        const iconEl = document.getElementById('receipt-bank-icon');
        iconEl.className = `${account.iconClass} ${account.colorClass}`; 

        document.getElementById('receipt-bank-name').textContent = account.bankName;
        document.getElementById('receipt-account-owner').textContent = account.owner;
        document.getElementById('receipt-account-number').textContent = account.number;
        
        const memo = state.transactionId;
        document.getElementById('receipt-memo').textContent = memo;

        const qrImg = document.getElementById('receipt-qr-img');
        const qrNotAvailable = document.getElementById('qr-not-available');
        
        if (account.bankCode === 'MB') {
            const qrUrl = `https://qr.sepay.vn/img?acc=${account.number}&bank=${account.bankCode}&amount=${state.amount}&des=${memo}&template=compact`;
            qrImg.src = qrUrl;
            qrImg.classList.remove('hidden');
            qrNotAvailable.classList.add('hidden');
        } else {
            qrImg.classList.add('hidden');
            qrNotAvailable.classList.remove('hidden');
        }
    };

    step3BackBtn.addEventListener('click', () => navigateToStep(2));

    copyStkBtn.addEventListener('click', () => {
        const accountNumber = document.getElementById('receipt-account-number').textContent;
        copyToClipboard(accountNumber, 'Đã sao chép STK!');
    });

    copyMemoBtn.addEventListener('click', () => {
        const memo = document.getElementById('receipt-memo').textContent;
        copyToClipboard(memo, 'Đã sao chép nội dung!');
    });

    // ----- Nút ĐÃ THANH TOÁN (Đã sửa lỗi) -----

    // 1. Tạo AbortController để quản lý trình nghe sự kiện // <-- FIX
    const paymentController = new AbortController();

    confirmPaymentBtn.addEventListener('click', async () => {
        confirmPaymentBtn.disabled = true;
        confirmPaymentBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG GỬI...';

        const account = accountsData[state.selectedAccountKey];
        const message = `
✅ THANH TOÁN THÀNH CÔNG
────────────────
🆔 Mã giao dịch: ${state.transactionId}
💰 Số tiền: ${formatCurrency(state.amount)}
📋 Loại thanh toán: ${state.paymentType}
🏦 Ngân hàng: ${account.bankName}
👤 Chủ tài khoản: ${account.owner}
📱 Số tài khoản: ${account.number}
⏰ Thời gian: ${state.transactionTime}
────────────────
Cảm ơn bạn đã sử dụng dịch vụ!
        `;
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message.trim()
                })
            });
            const data = await response.json();

            if (data.ok) {
                new Audio('https://hoagzih.github.io/payment/ting.mp3').play();
                showToast('Đã gửi thông báo thành công!');
                confirmPaymentBtn.innerHTML = '<i class="fa-solid fa-check"></i> ĐÃ GỬI THÀNH CÔNG';
                
                setTimeout(() => {
                    confirmPaymentBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> TẠO GIAO DỊCH MỚI';
                    confirmPaymentBtn.disabled = false;
                    confirmPaymentBtn.style.background = '#6c757d';

                    // 2. Hủy trình nghe sự kiện "gửi Telegram" // <-- FIX
                    paymentController.abort(); 
                    
                    // 3. Gán hành động "tải lại trang" // <-- FIX
                    confirmPaymentBtn.onclick = () => location.reload(); 
                    
                }, 2000);

            } else {
                throw new Error(data.description);
            }
        } catch (error) {
            console.error('Lỗi gửi Telegram:', error);
            showToast('Gửi thông báo thất bại! Vui lòng thử lại.');
            confirmPaymentBtn.disabled = false;
            confirmPaymentBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ĐÃ THANH TOÁN';
        }
    }, { signal: paymentController.signal }); // 1. Gán signal cho trình nghe sự kiện // <-- FIX

    // ----- KHỞI TẠO -----
    navigateToStep(1); 
    document.querySelector('input[name="bank-account"][value="mb_main"]').checked = true;
});
