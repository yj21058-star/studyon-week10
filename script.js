// 9주차: 입력 → 검증 → 내용 확인 → 저장. 실패하면 입력을 유지한다.
const form = document.querySelector('#plan-form');
const subjectInput = document.querySelector('#subject');
const goalInput = document.querySelector('#goal');
const emailInput = document.querySelector('#email');
const planTime = document.querySelector('#plan-time');
const hasDeadline = document.querySelector('#has-deadline');
const deadlineInput = document.querySelector('#deadline');
const reviewForm = document.querySelector('#flow-review');
const submitFeedback = document.querySelector('#submit-feedback');
const finishButton = document.querySelector('#finish-button');
const feedback = document.querySelector('#feedback');
const formInputs = [subjectInput, goalInput, planTime, deadlineInput, emailInput];
const touched = new Set();
const flowPanels = ['flow-welcome', 'plan-form', 'flow-review', 'flow-complete'].map(id => document.getElementById(id));
const stepNames = ['시작', '입력·선택', '확인', '완료'];
let currentStep = 0;
let confirmedPlan = null;
let isSubmitting = false;

function todayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function showStep(step) {
    if (isSubmitting) return;
    navigateTo('start');
    currentStep = step;
    flowPanels.forEach((panel, index) => { panel.hidden = index !== step; });
    document.querySelectorAll('.flow-progress li').forEach((item, index) => {
        if (index === step) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
    });
    document.querySelector('#flow-status').textContent = `${step + 1} / 4 단계 · ${stepNames[step]}`;
    flowPanels[step].querySelector('h3').focus();
}
function errorFor(input) {
    const value = input.value.trim();
    if (input.disabled) return '';
    if (input === subjectInput && (value.length < 2 || value.length > 60)) return '과목 이름을 2~60자로 입력해주세요. 예: UI/UX프로그래밍';
    if (input === goalInput && (value.length < 10 || value.length > 300)) return '학습 목표를 10~300자로 입력해주세요. 무엇을 얼마나 할지 적으면 좋아요.';
    if (input === planTime && !['20', '40', '60'].includes(value)) return '하루 학습 시간을 20분·40분·60분 중 선택해주세요.';
    if (input === deadlineInput && (!value || value < todayString() || input.validity.badInput)) return '마감일을 오늘 또는 이후로 선택해주세요. 필요 없다면 마감일 기록 선택을 해제하세요.';
    if (input === emailInput && value && (input.validity.typeMismatch || value.length > 254)) return '이메일을 이름@example.com 형식으로 수정하거나 비워주세요.';
    return '';
}
function showFieldError(input, message) {
    const messageNode = document.getElementById(input.id + '-error');
    messageNode.textContent = message;
    messageNode.hidden = !message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
}
function clearErrors() {
    touched.clear();
    formInputs.forEach(input => showFieldError(input, ''));
}
function showMessage(message, state = '') {
    feedback.textContent = message;
    feedback.className = 'feedback' + (state ? ' ' + state : '');
}
function updateGoalCount() {
    const length = goalInput.value.trim().length;
    document.querySelector('#goal-count').textContent = `${length} / 300자 · ${length >= 10 ? '최소 글자 수를 채웠어요.' : '10자 이상 입력해주세요.'}`;
}
function syncDeadline() {
    const enabled = hasDeadline.checked;
    document.querySelector('#deadline-fields').hidden = !enabled;
    deadlineInput.disabled = !enabled;
    deadlineInput.required = enabled;
    deadlineInput.min = todayString();
    if (!enabled) { touched.delete(deadlineInput.id); showFieldError(deadlineInput, ''); }
}
function editPlan() {
    if (isSubmitting) return;
    confirmedPlan = null;
    resetSaveState();
    updateGoalCount();
    formInputs.forEach(input => { if (touched.has(input.id)) showFieldError(input, errorFor(input)); });
    const invalid = formInputs.filter(input => errorFor(input));
    const shownErrors = invalid.filter(input => touched.has(input.id));
    showMessage(shownErrors.length ? '안내가 표시된 항목을 수정해주세요. 입력한 다른 내용은 그대로 유지됩니다.' :
        invalid.length ? '필수 항목을 입력하고 필요한 경우 마감일을 선택해주세요.' : '입력 조건을 모두 충족했어요. 다음 단계에서 내용을 확인하세요.',
        shownErrors.length ? 'error' : invalid.length ? '' : 'success');
}
function validateForm() {
    let firstError = null;
    formInputs.forEach(input => {
        touched.add(input.id);
        const error = errorFor(input);
        showFieldError(input, error);
        if (error && !firstError) firstError = input;
    });
    if (firstError) {
        showMessage('아래 안내에 따라 입력 내용을 고친 뒤 다시 눌러주세요.', 'error');
        firstError.focus();
        return false;
    }
    return true;
}
function confirmPlan(event) {
    event.preventDefault();
    if (currentStep !== 1 || isSubmitting || !validateForm()) return;
    confirmedPlan = {
        subject: subjectInput.value.trim(), goal: goalInput.value.trim(), minutes: Number(planTime.value),
        email: emailInput.value.trim() || '입력하지 않음', deadline: hasDeadline.checked ? deadlineInput.value : ''
    };
    document.querySelector('#preview-subject').textContent = confirmedPlan.subject;
    document.querySelector('#preview-goal').textContent = confirmedPlan.goal;
    document.querySelector('#preview-time').textContent = `${confirmedPlan.minutes}분`;
    document.querySelector('#preview-week').textContent = `${confirmedPlan.minutes * 5}분`;
    document.querySelector('#preview-email').textContent = confirmedPlan.email;
    document.querySelector('#preview-deadline').textContent = confirmedPlan.deadline || '정하지 않음';
    submitFeedback.textContent = '내용이 맞으면 계획을 저장하세요.';
    submitFeedback.className = 'feedback';
    showStep(2);
}
function resetPlan() {
    if (isSubmitting) return;
    form.reset(); syncDeadline(); clearErrors(); confirmedPlan = null;
    resetSaveState(); updateGoalCount();
    showMessage('필수 항목 3개를 입력해주세요.');
    document.querySelectorAll('#plan-preview dd').forEach(item => { item.textContent = ''; });
    document.querySelector('#complete-summary').replaceChildren();
    document.querySelector('#complete-message').textContent = '';
    dailyTime.value = ''; dailyTime.dispatchEvent(new Event('change'));
    readyButton.setAttribute('aria-pressed', 'false'); readyButton.textContent = '준비 완료로 표시';
    readyFeedback.textContent = '아직 준비 전이에요. 강의 자료와 제출 기한을 확인해주세요.';
    readyFeedback.className = 'feedback'; timeApplied.textContent = '';
    activateTab(tabs[0]); showStep(0);
}
document.querySelector('#begin-button').addEventListener('click', () => showStep(1));
document.querySelector('#back-start').addEventListener('click', () => showStep(0));
document.querySelector('#edit-button').addEventListener('click', () => {
    if (isSubmitting) return;
    confirmedPlan = null; resetSaveState(); showStep(1);
});
form.addEventListener('submit', confirmPlan);
form.addEventListener('input', editPlan);
planTime.addEventListener('change', editPlan);
hasDeadline.addEventListener('change', () => { syncDeadline(); editPlan(); });
formInputs.forEach(input => input.addEventListener('blur', () => {
    if (input.disabled || isSubmitting) return;
    touched.add(input.id); showFieldError(input, errorFor(input));
}));
document.querySelector('#reset-button').addEventListener('click', resetPlan);
document.querySelector('#restart-button').addEventListener('click', resetPlan);
syncDeadline();

// 6주차: 선택 탭과 해당 패널을 일대일로 연결한다.
const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab) {
    tabs.forEach(item => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
}
tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', event => {
        const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 :
            (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        activateTab(tabs[next]); tabs[next].focus();
    });
});
const dailyTime = document.querySelector('#daily-time');
const timeFeedback = document.querySelector('#time-feedback');
const applyTime = document.querySelector('#apply-time');
const timeApplied = document.querySelector('#time-applied');
dailyTime.addEventListener('change', () => {
    const minutes = Number(dailyTime.value);
    const selected = minutes > 0;
    timeFeedback.textContent = selected ? `하루 ${minutes}분, 주 5일이면 ${minutes * 5}분 학습할 수 있어요.` : '시간을 선택하면 주 5일 기준 학습 시간을 알려드려요.';
    timeFeedback.className = 'feedback' + (selected ? ' success' : '');
    applyTime.disabled = !selected;
    applyTime.textContent = selected ? '이 시간으로 준비하기' : '시간을 먼저 선택해주세요';
    timeApplied.hidden = true;
});
applyTime.addEventListener('click', () => {
    if (isSubmitting) return;
    planTime.value = dailyTime.value; editPlan(); showStep(1);
    timeApplied.textContent = `하루 ${dailyTime.value}분을 학습 계획에 반영했어요. 과목과 목표를 입력해주세요.`;
    timeApplied.className = 'feedback success'; timeApplied.hidden = false;
    applyTime.disabled = true; applyTime.textContent = '준비 완료';
});
const readyButton = document.querySelector('#ready-button');
const readyFeedback = document.querySelector('#ready-feedback');
readyButton.addEventListener('click', () => {
    const ready = readyButton.getAttribute('aria-pressed') !== 'true';
    readyButton.setAttribute('aria-pressed', String(ready));
    readyButton.textContent = ready ? '준비 표시 취소' : '준비 완료로 표시';
    readyFeedback.textContent = ready ? '준비 완료! 이제 학습 목표를 입력해보세요.' : '아직 준비 전이에요. 강의 자료와 제출 기한을 확인해주세요.';
    readyFeedback.className = 'feedback' + (ready ? ' success' : '');
});

// 중간고사: 확정한 계획을 보관 → 목록에서 다시 열기 → 학습 완료 기록.
// 입력 중인 계획과 보관한 계획을 분리해 '다시 시작'이 보관함을 지우지 않도록 한다.
const STORAGE_KEY = 'studyon.midterm.plans.v1';
const MAX_PLANS = 30;
const saveFeedback = document.querySelector('#save-feedback');
const openSavedButton = document.querySelector('#open-saved-plan');
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const filterLabels = { all: '전체', planned: '학습 예정', done: '학습 완료' };
let activeFilter = 'all';
const savedList = document.querySelector('#saved-list');
const libraryFeedback = document.querySelector('#library-feedback');
const storageFeedback = document.querySelector('#storage-feedback');
const deleteDialog = document.querySelector('#delete-dialog');
let savedPlans = [];
let selectedPlanId = null;
let lastSavedId = null;
let canWriteStorage = true;

function resetSaveState() {
    lastSavedId = null;
    finishButton.disabled = false;
    finishButton.textContent = '계획 저장';
    reviewForm.removeAttribute('aria-busy');
    submitFeedback.textContent = '내용이 맞으면 계획을 저장하세요.';
    submitFeedback.className = 'feedback';
    openSavedButton.hidden = true;
    setSaveFeedback('저장 결과가 여기에 표시됩니다.');
}
function setSaveFeedback(message, type = '') {
    saveFeedback.textContent = message;
    saveFeedback.className = 'feedback' + (type ? ' ' + type : '');
}
function notifyLibrary(message, type = 'success') {
    libraryFeedback.hidden = !message;
    libraryFeedback.textContent = message;
    libraryFeedback.className = 'feedback' + (type ? ' ' + type : '');
}
function validRecord(plan) {
    return plan && typeof plan.id === 'string' && plan.id.length > 0 &&
        typeof plan.subject === 'string' && plan.subject.trim().length > 0 && plan.subject.length <= 60 &&
        typeof plan.goal === 'string' && plan.goal.trim().length > 0 && plan.goal.length <= 300 &&
        [20, 40, 60].includes(plan.minutes) && typeof plan.email === 'string' && plan.email.length <= 254 &&
        (plan.deadline === undefined || plan.deadline === '' || (typeof plan.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(plan.deadline))) &&
        ['planned', 'done'].includes(plan.status) &&
        typeof plan.createdAt === 'string' && Number.isFinite(Date.parse(plan.createdAt));
}
function loadPlans() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const records = raw === null ? [] : JSON.parse(raw);
        if (!Array.isArray(records) || records.length > MAX_PLANS || !records.every(validRecord) ||
            new Set(records.map(plan => plan.id)).size !== records.length) throw new Error('Invalid saved plans');
        savedPlans = records;
        canWriteStorage = true;
        storageFeedback.hidden = true;
        return true;
    } catch {
        // 읽지 못한 기존 데이터를 빈 배열로 덮어쓰지 않는다.
        canWriteStorage = false;
        storageFeedback.hidden = false;
        storageFeedback.textContent = '보관함을 읽지 못했어요. 기존 자료를 보호하기 위해 저장·변경을 멈췄습니다. 브라우저의 사이트 저장 허용 여부를 확인하고 새로고침해주세요. 작성한 계획은 현재 화면에서 확인할 수 있어요.';
        return false;
    }
}
function persistPlans(next) {
    if (!canWriteStorage) return false;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        savedPlans = next;
        storageFeedback.hidden = true;
        return true;
    } catch {
        storageFeedback.hidden = false;
        storageFeedback.textContent = '변경 내용을 보관하지 못했어요. 저장 공간 또는 사이트 저장 허용 여부를 확인한 뒤 같은 버튼으로 다시 시도해주세요. 기존 보관함은 변경되지 않았습니다.';
        return false;
    }
}
function planLabel(plan) { return plan.status === 'done' ? '학습 완료' : '학습 예정'; }
function dateLabel(value) { return new Date(value).toLocaleDateString('ko-KR'); }
function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}
function renderPlans() {
    const filtered = savedPlans.filter(plan => activeFilter === 'all' || plan.status === activeFilter);
    const doneCount = savedPlans.filter(plan => plan.status === 'done').length;
    document.querySelector('#saved-count').textContent = `${savedPlans.length}개 보관 · ${doneCount}개 완료`;
    document.querySelector('#filter-summary').textContent = `${filterLabels[activeFilter]} · ${filtered.length}개 표시 / 전체 ${savedPlans.length}개`;
    filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter)));
    savedList.replaceChildren();
    filtered.forEach(plan => {
        const item = element('li', 'saved-card');
        const article = element('article');
        const top = element('div', 'card-top');
        top.append(element('span', 'status-badge ' + plan.status, planLabel(plan)), element('span', 'input-hint', dateLabel(plan.createdAt)));
        const open = element('button', 'secondary-button', '계획 다시 열기');
        open.type = 'button';
        open.setAttribute('aria-label', plan.subject + ' 계획 다시 열기');
        open.addEventListener('click', () => { notifyLibrary(''); openPlan(plan.id); });
        article.append(top, element('h3', '', plan.subject), element('p', 'card-goal', plan.goal),
            element('p', 'input-hint', `하루 ${plan.minutes}분 · 주 5일 ${plan.minutes * 5}분`), open);
        item.append(article); savedList.append(item);
    });
    document.querySelector('#empty-plans').hidden = filtered.length > 0;
    const hasPlans = savedPlans.length > 0;
    document.querySelector('#empty-heading').textContent = hasPlans ? `${filterLabels[activeFilter]} 상태의 계획은 아직 없어요` : '보관한 계획이 아직 없어요';
    document.querySelector('#empty-message').textContent = hasPlans ? '전체 계획으로 돌아가 학습할 목표를 확인해보세요.' : '계획을 입력하고 확인 화면에서 ‘계획 저장’을 눌러보세요.';
    document.querySelector('#empty-action').textContent = hasPlans ? '전체 계획 보기' : '계획 만들러 가기';
}
function showList(focus = true) {
    selectedPlanId = null;
    document.querySelector('#saved-detail').hidden = true;
    document.querySelector('#saved-list-view').hidden = false;
    renderPlans();
    if (focus) { navigateTo('saved-plans'); document.querySelector('#saved-heading').focus(); }
}
function openPlan(id, focus = true) {
    const plan = savedPlans.find(item => item.id === id);
    if (!plan) {
        showList(); notifyLibrary('이 계획은 더 이상 보관함에 없어요. 다른 계획을 선택하거나 새 계획을 만들어주세요.', 'error');
        return;
    }
    selectedPlanId = id;
    document.querySelector('#saved-list-view').hidden = true;
    document.querySelector('#saved-detail').hidden = false;
    document.querySelector('#detail-title').textContent = plan.subject;
    document.querySelector('#detail-goal').textContent = plan.goal;
    document.querySelector('#detail-time').textContent = `하루 ${plan.minutes}분 · 주 5일 ${plan.minutes * 5}분`;
    document.querySelector('#detail-email').textContent = plan.email;
    document.querySelector('#detail-date').textContent = dateLabel(plan.createdAt);
    document.querySelector('#detail-deadline').textContent = plan.deadline || '정하지 않음';
    const badge = document.querySelector('#detail-state');
    badge.textContent = planLabel(plan); badge.className = 'status-badge ' + plan.status;
    document.querySelector('#toggle-complete').textContent = plan.status === 'done' ? '학습 예정으로 되돌리기' : '학습 완료로 표시';
    document.querySelector('#detail-guidance').textContent = plan.status === 'done' ? '목표를 완료했어요! 더 학습하려면 예정으로 되돌리거나 목록에서 다음 계획을 골라보세요.' : '위 목표를 실천한 뒤 학습 완료로 표시하세요. 지금은 학습 예정 상태예요.';
    if (focus) { navigateTo('saved-plans'); document.querySelector('#detail-title').focus(); }
}
// 제출은 확인 화면의 form submit에서 처리한다. 버튼/상태 잠금으로 중복을 막는다.
async function submitPlan(event) {
    event.preventDefault();
    if (isSubmitting || currentStep !== 2 || !confirmedPlan) return;
    // 확인 화면을 오래 열어둔 사이 날짜가 바뀌었을 때도 검사한다.
    if (formInputs.some(input => errorFor(input))) { showStep(1); validateForm(); return; }
    isSubmitting = true;
    reviewForm.setAttribute('aria-busy', 'true');
    finishButton.disabled = true;
    document.querySelector('#edit-button').disabled = true;
    finishButton.textContent = '저장 중…';
    submitFeedback.textContent = '계획을 보관함에 저장하고 있어요. 잠시만 기다려주세요.';
    submitFeedback.className = 'feedback';
    const submitted = { ...confirmedPlan };
    let stored = null;
    let duplicate = false;
    try {
        // 진행 상태를 그린 다음 브라우저 저장소에 기록한다. 서버 요청은 하지 않는다.
        await new Promise(resolve => setTimeout(resolve, 800));
        if (!loadPlans()) throw new Error('보관함을 읽지 못했어요. 브라우저의 사이트 저장 허용 여부를 확인하고 다시 시도해주세요.');
        stored = savedPlans.find(plan => ['subject', 'goal', 'minutes', 'email'].every(key => plan[key] === submitted[key]) && (plan.deadline || '') === submitted.deadline);
        duplicate = Boolean(stored);
        if (!stored) {
            if (savedPlans.length >= MAX_PLANS) throw new Error('보관함이 30개로 가득 찼어요. 필요 없는 계획을 지운 뒤 다시 저장해주세요.');
            stored = { ...submitted, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'planned' };
            if (!persistPlans([stored, ...savedPlans])) throw new Error('저장하지 못했어요. 사이트 저장 허용 여부와 저장 공간을 확인한 뒤 다시 시도해주세요. 입력 내용은 그대로 있습니다.');
        }
    } catch (error) {
        submitFeedback.textContent = error.message || '저장하지 못했어요. 입력 내용은 그대로 있으니 다시 시도해주세요.';
        submitFeedback.className = 'feedback error';
        stored = null;
    } finally {
        isSubmitting = false;
        reviewForm.removeAttribute('aria-busy');
        finishButton.disabled = false;
        document.querySelector('#edit-button').disabled = false;
        finishButton.textContent = stored ? '계획 저장' : '다시 저장하기';
    }
    if (!stored) { finishButton.focus(); return; }
    lastSavedId = stored.id;
    document.querySelector('#complete-message').textContent = `${stored.subject}: 하루 ${stored.minutes}분씩, 주 5일 학습 계획을 저장했어요.`;
    const summary = document.querySelector('#plan-preview dl').cloneNode(true);
    summary.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    document.querySelector('#complete-summary').replaceChildren(summary);
    setSaveFeedback(duplicate ? '같은 계획이 이미 있어 중복으로 추가하지 않았어요. 보관한 계획을 이어서 확인하세요.' : '보관함에 추가했어요. 이 브라우저에서 다음에 다시 볼 수 있어요.', 'success');
    openSavedButton.hidden = false;
    activeFilter = 'all'; showList(false);
    showStep(3);
}
reviewForm.addEventListener('submit', submitPlan);
openSavedButton.addEventListener('click', () => { notifyLibrary(''); openPlan(lastSavedId); });
document.querySelector('#back-to-list').addEventListener('click', () => showList());
filterButtons.forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter; notifyLibrary(''); renderPlans();
}));

// 빈 보관함에서는 작성 중인 내용을 보존해 기존 흐름으로 안내한다.
document.querySelector('#empty-action').addEventListener('click', () => {
    if (savedPlans.length) { activeFilter = 'all'; renderPlans(); filterButtons[0].focus(); }
    else { showStep(currentStep === 0 ? 1 : currentStep); }
});
document.querySelector('#new-plan').addEventListener('click', () => {
    if (isSubmitting) return;
    // 기존 작성 중인 값을 유지한다. 초기화는 명시적인 '다시 시작'에서만 한다.
    if (currentStep === 3 && lastSavedId) resetPlan();
    showStep(currentStep === 0 ? 1 : currentStep);
});
document.querySelector('#toggle-complete').addEventListener('click', () => {
    if (!loadPlans()) return;
    const plan = savedPlans.find(item => item.id === selectedPlanId);
    if (!plan) return openPlan(selectedPlanId);
    const status = plan.status === 'done' ? 'planned' : 'done';
    const next = savedPlans.map(item => item.id === plan.id ? { ...item, status } : item);
    if (!persistPlans(next)) return notifyLibrary('상태 변경을 저장하지 못했어요. 위 안내를 확인한 뒤 다시 시도해주세요.', 'error');
    renderPlans(); openPlan(plan.id, false);
    notifyLibrary(status === 'done' ? '학습 완료로 기록했어요. 목록으로 돌아가 다음 계획을 확인하세요.' : '학습 예정으로 되돌렸어요. 목표를 다시 실천할 수 있어요.');
});
document.querySelector('#request-delete').addEventListener('click', () => {
    const plan = savedPlans.find(item => item.id === selectedPlanId);
    if (!plan) return openPlan(selectedPlanId);
    document.querySelector('#delete-description').textContent = `삭제할 계획: ${plan.subject}`;
    deleteDialog.showModal();
});
function cancelDelete() {
    deleteDialog.close();
    notifyLibrary('삭제를 취소했어요. 계획과 학습 상태가 그대로 유지됩니다.');
    document.querySelector('#request-delete').focus();
}
document.querySelector('#cancel-delete').addEventListener('click', cancelDelete);
deleteDialog.addEventListener('cancel', event => { event.preventDefault(); cancelDelete(); });
document.querySelector('#confirm-delete').addEventListener('click', () => {
    deleteDialog.close();
    if (!loadPlans()) return;
    const id = selectedPlanId;
    if (!savedPlans.some(plan => plan.id === id)) return openPlan(id);
    if (!persistPlans(savedPlans.filter(plan => plan.id !== id))) return notifyLibrary('삭제하지 못했어요. 계획은 그대로 있으니 저장 공간과 브라우저 설정을 확인해주세요.', 'error');
    if (lastSavedId === id) resetSaveState();
    showList(); notifyLibrary('계획을 삭제했어요. 다른 계획을 열거나 새 계획을 만들어보세요.');
});
// 같은 사이트의 다른 탭에서 변경해도 오래된 목록으로 덮어쓰지 않는다.
window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    if (loadPlans()) {
        renderPlans();
        if (selectedPlanId) openPlan(selectedPlanId, false);
        if (lastSavedId && !savedPlans.some(plan => plan.id === lastSavedId)) resetSaveState();
    }
});
loadPlans(); renderPlans();


// 10주차: 주소의 해시가 현재 화면의 기준이다. 새로고침과 뒤로 가기도 같은 함수로 반영한다.
const routeSections = {
    start: ['start'], 'saved-plans': ['saved-plans'], workspace: ['workspace'], about: ['about', 'features', 'steps']
};
const routeNames = { start: '계획 만들기', 'saved-plans': '내 계획 보관함', workspace: '학습 도구', about: '서비스 안내' };
const menu = document.querySelector('#main-menu');
const menuToggle = document.querySelector('#menu-toggle');
const menuLinks = [...menu.querySelectorAll('[data-route]')];
const narrowScreen = window.matchMedia('(max-width: 768px)');
let menuOpen = false;

function routeFromHash() {
    const hash = window.location.hash.slice(1);
    if (hash === 'features' || hash === 'steps') return 'about';
    return Object.hasOwn(routeSections, hash) ? hash : 'start';
}
function syncMenu() {
    menu.hidden = narrowScreen.matches && !menuOpen;
    menuToggle.hidden = !narrowScreen.matches;
    menuToggle.setAttribute('aria-expanded', String(!menu.hidden));
    menuToggle.textContent = menuOpen ? '메뉴 닫기' : '메뉴 열기';
}
function closeMenu() { menuOpen = false; syncMenu(); }
function renderRoute(focus = false) {
    const route = routeFromHash();
    const visibleIds = routeSections[route];
    document.querySelectorAll('main > section').forEach(section => { section.hidden = !visibleIds.includes(section.id); });
    menuLinks.forEach(link => {
        if (link.dataset.route === route) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
    });
    document.querySelector('#current-location').textContent = `현재 위치: ${routeNames[route]}`;
    closeMenu();
    if (focus) document.getElementById(visibleIds[0]).querySelector('h2').focus();
}
function navigateTo(route) {
    if (!Object.hasOwn(routeSections, route)) return;
    if (window.location.hash !== '#' + route) {
        window.history.pushState(null, '', '#' + route);
    }
    renderRoute();
}
document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = link.getAttribute('href').slice(1);
    const route = ['features', 'steps'].includes(target) ? 'about' : target === 'top' ? 'start' : target;
    if (!Object.hasOwn(routeSections, route)) return;
    event.preventDefault(); navigateTo(route); renderRoute(true);
});
menuToggle.addEventListener('click', () => { menuOpen = !menuOpen; syncMenu(); });
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && narrowScreen.matches && menuOpen) { closeMenu(); menuToggle.focus(); }
});
narrowScreen.addEventListener('change', () => closeMenu());
window.addEventListener('popstate', () => renderRoute());
window.addEventListener('hashchange', () => renderRoute());
if (!Object.hasOwn(routeSections, window.location.hash.slice(1))) window.history.replaceState(null, '', '#' + routeFromHash());
renderRoute();
