// ==========================================
// 0. ÉP CSS ĐỊNH DẠNG TIMELINE TỪ BÊN TRONG JS
// ==========================================
const msProjectStyles = document.createElement('style');
msProjectStyles.innerHTML = `
    .gantt .grid-header { fill: #ffffff !important; }
    .gantt .upper-text { fill: #333 !important; font-weight: bold !important; font-size: 13px !important; }
    .gantt .lower-text { fill: #666 !important; font-size: 12px !important; }
    .ms-split-line, .ms-v-divider { stroke: #d0d0d0 !important; stroke-width: 1px !important; }
`;
document.head.appendChild(msProjectStyles);

// ==========================================
// 1. KHỞI TẠO DỮ LIỆU & CẤU HÌNH
// ==========================================
let tasks = JSON.parse(localStorage.getItem('bim_ai_tasks')) || [];

const ganttOptions = {
    header_height: 65,
    column_width: 40,
    step: 24,
    bar_height: 25,
    bar_corner_radius: 4,
    arrow_curve: 5,
    padding: 20,
    view_mode: 'Week',
    date_format: 'YYYY-MM-DD'
};

let gantt = null;

function formatToDDMMYY(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
}

function calculateDuration(start, end) {
    const d1 = new Date(start); const d2 = new Date(end);
    const timeDiff = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return diffDays + 1 + " days";
}

function cleanDependencies(depStr) {
    if (!depStr) return "";
    let parts = depStr.split(',');
    let result = [];
    parts.forEach(p => {
        let match = p.match(/\d+/);
        if (match) result.push("T" + match[0]);
    });
    return result.join(', ');
}

function deleteTask(index) {
    tasks.splice(index, 1);
    tasks.forEach((t, i) => { t.id = "T" + (i + 1); });
    renderWorkspace();
}

// ==========================================
// HÀM ÉP ĐỊNH DẠNG TIMELINE CHUẨN MS PROJECT
// ==========================================
function applyMSProjectFormat() {
    const gSvg = document.getElementById('gantt-target');
    if (!gSvg) return;

    const dateGroup = gSvg.querySelector('.date');
    const gridGroup = gSvg.querySelector('.grid');
    if (!dateGroup || !gridGroup) return;

    const gridHeaderBg = gridGroup.querySelector('.grid-header');
    if (gridHeaderBg) gridHeaderBg.setAttribute('fill', '#ffffff');

    let splitLine = dateGroup.querySelector('.ms-split-line');
    if (!splitLine) {
        splitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        splitLine.setAttribute('class', 'ms-split-line');
        dateGroup.appendChild(splitLine);
    }
    splitLine.setAttribute('x1', '0');
    splitLine.setAttribute('x2', gSvg.getAttribute('width') || 3000);
    splitLine.setAttribute('y1', '32');
    splitLine.setAttribute('y2', '32');

    const ticks = gridGroup.querySelectorAll('.tick');
    const tickCount = ticks.length.toString();
    
    if (dateGroup.getAttribute('data-tick-count') !== tickCount) {
        dateGroup.querySelectorAll('.ms-v-divider').forEach(el => el.remove());
        ticks.forEach(tick => {
            const dAttr = tick.getAttribute('d');
            if (dAttr) {
                const match = dAttr.match(/M\s*([\d\.]+)/);
                if (match) {
                    const x = parseFloat(match[1]);
                    const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    vLine.setAttribute('class', 'ms-v-divider');
                    vLine.setAttribute('x1', x);
                    vLine.setAttribute('x2', x);
                    vLine.setAttribute('y1', '32'); 
                    vLine.setAttribute('y2', '65'); 
                    dateGroup.appendChild(vLine);
                }
            }
        });
        dateGroup.setAttribute('data-tick-count', tickCount);
    }

    const upperTexts = dateGroup.querySelectorAll('.upper-text');
    let currentYear = (gantt && gantt.gantt_start) ? gantt.gantt_start.getFullYear() : new Date().getFullYear();
    let lastMonthIndex = -1;
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

    upperTexts.forEach(t => {
        let txt = t.textContent.trim();
        let mIndex = monthNames.findIndex(m => txt.toLowerCase().startsWith(m));
        if (mIndex !== -1) {
            if (lastMonthIndex !== -1 && mIndex < lastMonthIndex) currentYear++;
            lastMonthIndex = mIndex;
            if (!/\d{4}/.test(txt)) t.textContent = txt + ' ' + currentYear;
        }
        t.setAttribute('y', '20'); 
    });

    const lowerTexts = dateGroup.querySelectorAll('.lower-text');
    lowerTexts.forEach(t => {
        let txt = t.textContent.trim();
        let match = txt.match(/^(\d{1,2})/); 
        if (match && txt !== match[1]) t.textContent = match[1];
        t.setAttribute('y', '54'); 
    });
}

if (window.ganttFormatterInterval) clearInterval(window.ganttFormatterInterval);
window.ganttFormatterInterval = setInterval(applyMSProjectFormat, 200);

// ==========================================
// THUẬT TOÁN ĐÁNH GIÁ TRẠNG THÁI 4D (CHO BẢNG)
// ==========================================
function getTaskStatus(task) {
    if (!task.modelDisplayName || task.modelDisplayName === "select model") {
        return { class: 'status-none', text: 'None (Chưa gán 3D)' };
    }

    const simInput = document.getElementById('simulatedToday').value;
    const today = simInput ? new Date(simInput) : new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(task.start); start.setHours(0, 0, 0, 0);
    const end = new Date(task.end); end.setHours(0, 0, 0, 0);

    if (today > end) {
        return { class: 'status-completed', text: 'Completed (Đã xong)' };
    } else if (today >= start && today <= end) {
        return { class: 'status-started', text: 'Started (Đang thi công)' };
    } else if (today < start) {
        const diffTime = Math.abs(start - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays <= 3) return { class: 'status-commit', text: 'Commit (Sắp thi công)' };
        else if (diffDays <= 7) return { class: 'status-enable', text: 'Enable (Chuẩn bị)' };
    }
    return { class: 'status-none', text: 'None (Chưa đến hạn)' };
}

document.getElementById('simulatedToday').addEventListener('change', renderWorkspace);

// ==========================================
// RENDER GIAO DIỆN CHỐNG NHẢY GANTT
// ==========================================
function renderWorkspace() {
    localStorage.setItem('bim_ai_tasks', JSON.stringify(tasks));
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    const ganttLayout = document.querySelector('.gantt-layout');
    ganttLayout.innerHTML = '<svg id="gantt-target"></svg>';

    if (tasks.length === 0) {
        tbody.innerHTML = `<tr style="height: 100px !important;">
            <td colspan="10" style="text-align:center; white-space: normal; color: #888; font-style: italic; border: none;">
                Bảng đang trống. Hãy dùng nút "Nhập từ MS Project" để dán dữ liệu vào đây!
            </td>
        </tr>`;
        return;
    }

    tasks.forEach((task, index) => {
        const tr = document.createElement("tr");
        if (task.level === 0) tr.classList.add('summary-task');

        let displayPred = task.rawDependencies !== undefined ? task.rawDependencies : (task.dependencies || "");
        const modelDisplayText = task.modelDisplayName ? task.modelDisplayName : "select model";
        const modelStyle = task.modelDisplayName ? "color: #e65100; text-decoration: none; font-weight: bold;" : "";

        const status = getTaskStatus(task);
        task.custom_class = task.isSummary ? "bar-summary" : "bar-detail";

        tr.innerHTML = `
            <td class="col-id">${index + 1}</td>
            <td class="col-icon" title="${status.text}">
                <span class="task-status-dot ${status.class}" id="dot-${index}"></span>
            </td>
            <td class="col-name level-${task.level}">${task.name}</td>
            <td class="col-dur">${calculateDuration(task.start, task.end)}</td>
            <td class="col-date">${formatToDDMMYY(task.start)}</td>
            <td class="col-date">${formatToDDMMYY(task.end)}</td>
            <td class="col-pred">${displayPred}</td>
            <td class="col-res"></td>
            <td class="col-model"><span class="select-model-btn" style="${modelStyle}" onclick="select3DModel(${index})">${modelDisplayText}</span></td>
            <td class="col-action"></td>
        `;

        const tdAction = tr.querySelector('.col-action');
        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-delete'; btnDelete.title = 'Xóa dòng này'; btnDelete.innerHTML = '🗑️';
        btnDelete.onclick = function () { deleteTask(index); };
        tdAction.appendChild(btnDelete);
        tbody.appendChild(tr);
    });

    try {
        if (tasks.length > 0) {
            gantt = new Gantt("#gantt-target", tasks, ganttOptions);

            setTimeout(() => {
                const ganttGridRows = document.querySelectorAll('#gantt-target .grid-row');
                const tableBodyRows = document.querySelectorAll('#tableBody tr');
                
                let headerHeight = 65, rowHeight = 65;
                if (ganttGridRows.length > 0) {
                    headerHeight = parseFloat(ganttGridRows[0].getAttribute('y'));
                    rowHeight = parseFloat(ganttGridRows[0].getAttribute('height'));
                }

                const trHead = document.querySelector('#projectTable thead tr');
                if (trHead) trHead.style.setProperty('height', headerHeight + 'px', 'important');
                const ths = document.querySelectorAll('#projectTable thead th');
                ths.forEach(th => th.style.setProperty('height', headerHeight + 'px', 'important'));

                if (tableBodyRows.length > 0) {
                    tableBodyRows.forEach(tr => {
                        tr.style.setProperty('height', rowHeight + 'px', 'important');
                        tr.querySelectorAll('td').forEach(td => td.style.setProperty('height', rowHeight + 'px', 'important'));
                    });
                }
                
                applyMSProjectFormat();

                const gContainer = document.querySelector('.gantt-container');
                if (gContainer) {
                    const overlay = document.createElement('div');
                    overlay.id = 'gantt-numbers-overlay';
                    overlay.style.position = 'absolute';
                    overlay.style.top = '0';
                    overlay.style.left = '0';
                    overlay.style.bottom = '15px'; 
                    overlay.style.width = '40px'; 
                    overlay.style.backgroundColor = '#f0f0f0';
                    overlay.style.borderRight = '1px solid #d0d0d0';
                    overlay.style.borderLeft = '1px solid #d0d0d0';
                    overlay.style.zIndex = '5';
                    overlay.style.overflow = 'hidden';
                    overlay.style.pointerEvents = 'none'; 

                    const inner = document.createElement('div');
                    inner.id = 'gantt-numbers-inner';
                    inner.style.position = 'absolute';
                    inner.style.top = '0'; inner.style.left = '0'; inner.style.right = '0';

                    const headerSpacer = document.createElement('div');
                    headerSpacer.style.height = headerHeight + 'px';
                    headerSpacer.style.borderBottom = '1px solid #d0d0d0';
                    headerSpacer.style.backgroundColor = '#ffffff'; 
                    headerSpacer.style.boxSizing = 'border-box';
                    inner.appendChild(headerSpacer);

                    tasks.forEach((task, index) => {
                        const numDiv = document.createElement('div');
                        numDiv.style.height = rowHeight + 'px';
                        numDiv.style.display = 'flex';
                        numDiv.style.alignItems = 'center';
                        numDiv.style.justifyContent = 'center';
                        numDiv.style.fontWeight = 'bold';
                        numDiv.style.color = '#666'; 
                        numDiv.style.fontSize = '12px'; 
                        numDiv.style.backgroundColor = '#f0f0f0'; 
                        numDiv.style.borderBottom = '1px solid #d0d0d0';
                        numDiv.style.boxSizing = 'border-box';
                        numDiv.innerText = index + 1;
                        inner.appendChild(numDiv);
                    });

                    overlay.appendChild(inner);
                    ganttLayout.appendChild(overlay);

                    gContainer.addEventListener('scroll', () => {
                        inner.style.transform = `translateY(-${gContainer.scrollTop}px)`;
                    });
                }
            }, 100); 
        }
    } catch (error) {
        console.error("Lỗi vẽ biểu đồ:", error);
    }
}

renderWorkspace();

// ==========================================
// CÁC SỰ KIỆN NÚT BẤM VÀ XỬ LÝ KHÁC
// ==========================================
document.getElementById('btnAddTask').addEventListener('click', function () {
    const nameVal = document.getElementById('taskName').value.trim();
    const startVal = document.getElementById('taskStart').value;
    const endVal = document.getElementById('taskEnd').value;
    const levelVal = parseInt(document.getElementById('taskLevel').value);

    if (!nameVal || !startVal || !endVal) return;

    tasks.push({
        id: "T" + (tasks.length + 1), name: nameVal, start: startVal, end: endVal,
        progress: 0, rawDependencies: "", dependencies: "",
        level: levelVal, isSummary: levelVal < 2, custom_class: levelVal < 2 ? "bar-summary" : "bar-detail"
    });

    renderWorkspace();
    document.getElementById('taskName').value = ""; document.getElementById('taskName').focus();
});

document.getElementById('btnTogglePaste').addEventListener('click', function () {
    document.getElementById('pasteArea').style.display = 'block'; document.getElementById('pasteInput').focus();
});
document.getElementById('btnClosePaste').addEventListener('click', function () {
    document.getElementById('pasteArea').style.display = 'none'; document.getElementById('pasteInput').value = '';
});

function parseExcelDate(dateStr) {
    if (!dateStr) return "";
    let cleanedDate = dateStr.replace(/^[a-zA-Z]{3}\s+/, '').trim().split(' ')[0];
    let parts = cleanedDate.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        else if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        else if (parts[2].length === 2) return `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return cleanedDate;
}

function processPastedData(pastedText) {
    const rows = pastedText.split(/\r\n|\n/).filter(line => line.trim() !== '');
    let isAdded = false;

    rows.forEach(row => {
        const cols = row.split('\t');
        if (cols.length < 3) return;

        let nameVal = "", startVal = "", endVal = "", predVal = "";
        let dateCols = [];

        cols.forEach((col, idx) => {
            if (col.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/)) dateCols.push({ index: idx, value: col });
        });

        if (dateCols.length >= 2) {
            let startIdx = dateCols[0].index; let endIdx = dateCols[1].index;
            startVal = parseExcelDate(dateCols[0].value); endVal = parseExcelDate(dateCols[1].value);

            for (let i = startIdx - 1; i >= 0; i--) {
                let text = cols[i].trim();
                if (text && !text.toLowerCase().includes('day') && !text.toLowerCase().includes('scheduled') && !text.match(/^\d+(\.\d+)?$/)) {
                    nameVal = text; break;
                }
            }
            if (!nameVal) nameVal = cols[0].trim();
            if (cols.length > endIdx + 1) predVal = cols[endIdx + 1].trim();

            if (nameVal && startVal && endVal && !startVal.includes("undefined")) {
                tasks.push({
                    id: "T" + (tasks.length + 1), name: nameVal, start: startVal, end: endVal, progress: 0,
                    rawDependencies: predVal, dependencies: cleanDependencies(predVal),
                    level: 2, isSummary: false, custom_class: "bar-detail"
                });
                isAdded = true;
            }
        }
    });

    if (isAdded) renderWorkspace();
    else alert("Lỗi: Không tìm thấy cột ngày tháng hợp lệ. Hãy kiểm tra lại dữ liệu Copy!");
}

document.getElementById('btnConfirmPaste').addEventListener('click', function () {
    const text = document.getElementById('pasteInput').value;
    if (text) {
        processPastedData(text); document.getElementById('pasteArea').style.display = 'none'; document.getElementById('pasteInput').value = '';
    }
});

document.addEventListener('paste', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('Text');
    if (pastedText) processPastedData(pastedText);
});

async function select3DModel(taskIndex) {
    try {
        if (typeof TrimbleConnectWorkspace === 'undefined') {
            alert("Không tìm thấy Trimble Connect API. Đảm bảo ứng dụng đang mở trong Trimble Connect."); return;
        }
        const API = await TrimbleConnectWorkspace.connect(window.parent);
        const selection = await API.viewer.getSelection();
        const hasSelection = selection && selection.length > 0 && selection.some(model => model.objectRuntimeIds && model.objectRuntimeIds.length > 0);

        if (!hasSelection) {
            alert("⚠️ Bạn chưa chọn khối 3D nào! Vui lòng click chọn khối 3D trên mô hình (khối sáng viền vàng) trước khi bấm gán."); return;
        }

        let totalSelected = 0, firstModelId = null, firstObjectId = null;
        selection.forEach(model => {
            if (model.objectRuntimeIds && model.objectRuntimeIds.length > 0) {
                totalSelected += model.objectRuntimeIds.length;
                if (!firstModelId) { firstModelId = model.modelId; firstObjectId = model.objectRuntimeIds[0]; }
            }
        });

        let modelName = "Object";
        try {
            if (firstModelId && firstObjectId !== null) {
                const objectProps = await API.viewer.getObjectProperties(firstModelId, [firstObjectId]);
                if (objectProps && objectProps.length > 0) {
                    const obj = objectProps[0]; let foundLayer = null;
                    if (obj.properties && Array.isArray(obj.properties)) {
                        for (let pset of obj.properties) {
                            if (pset.properties && Array.isArray(pset.properties)) {
                                let layerProp = pset.properties.find(p => p.name && p.name.toLowerCase().includes('layer'));
                                if (layerProp) { foundLayer = layerProp.value; break; }
                            }
                        }
                    }
                    if (foundLayer) modelName = foundLayer;
                    else if (obj.class) modelName = obj.class.replace(/^Ifc/, '');
                }
            }
        } catch (err) { console.warn("Không trích xuất được tên Layer, dùng tên mặc định.", err); }

        const task = tasks[taskIndex];
        task.modelObjects = selection;
        task.modelDisplayName = `(${totalSelected}) ${modelName}`;
        renderWorkspace();

    } catch (error) {
        console.error("Lỗi khi kết nối với Trimble Connect:", error);
        alert("Có lỗi xảy ra khi lấy dữ liệu từ mô hình. Bạn ấn F12 xem tab Console để biết chi tiết nhé.");
    }
}

document.getElementById('btnDeleteAll').addEventListener('click', function () {
    if (tasks.length === 0) {
        alert("Bảng đang trống, không có gì để xóa!");
        return;
    }
    const isConfirm = confirm("⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ công việc không?\\nHành động này sẽ không thể hoàn tác!");
    if (isConfirm) {
        tasks = []; 
        localStorage.removeItem('bim_ai_tasks'); 
        renderWorkspace(); 
    }
});

// ==========================================
// ĐỒNG BỘ 3D VÀ RUN TIMELINE (BẢN CHUẨN XÓA LỖI MÀU)
// ==========================================
const colorMap = {
    'status-none': { r: 140, g: 147, b: 155, a: 0.2 }, // Xám mờ cho việc chưa làm   
    'status-enable': { r: 23, g: 123, b: 192, a: 1 },   
    'status-commit': { r: 12, g: 67, b: 107, a: 1 },    
    'status-started': { r: 247, g: 164, b: 28, a: 1 },  
    'status-paused': { r: 188, g: 30, b: 38, a: 1 },    
    'status-completed': { r: 0, g: 109, b: 57, a: 1 }   
};

document.getElementById('btnSync').addEventListener('click', async function () {
    if (typeof TrimbleConnectWorkspace === 'undefined') {
        alert("⚠️ Tính năng này chỉ chạy bên trong môi trường Trimble Connect!");
        return;
    }
    let API;
    try { API = await TrimbleConnectWorkspace.connect(window.parent); } 
    catch (err) { alert("⚠️ Lỗi kết nối API!"); return; }

    await API.viewer.setSelection([]);

    try {
        if (API.viewer.resetColors) await API.viewer.resetColors();
    } catch (err) { console.warn("Bỏ qua lỗi Reset màu:", err); }

    let allColorRequests = [];
    let paintedCount = 0;

    for (let task of tasks) {
        if (task.modelObjects && task.modelObjects.length > 0) {
            const status = getTaskStatus(task);
            const rgbColor = colorMap[status.class];
            if (rgbColor) {
                task.modelObjects.forEach(obj => {
                    allColorRequests.push({
                        modelId: obj.modelId,
                        objectRuntimeIds: obj.objectRuntimeIds,
                        color: rgbColor
                    });
                });
                paintedCount++;
            }
        }
    }

    try {
        if (allColorRequests.length > 0) {
            await API.viewer.setColors(allColorRequests);
            alert(`✅ Đã nhuộm màu 4D cho ${paintedCount} nhóm công việc!`);
        } else {
            alert("Bạn chưa gán 3D cho công việc nào cả.");
        }
    } catch (err) { alert("Lỗi khi nhuộm màu 3D!"); }
});

// 8. ĐỘNG CƠ "RUN TIMELINE" (AUTO PLAY 4D)
let timelineInterval = null;
let isRunning = false;
let currentDateTracker = null;

function getFastStatusForDate(task, targetDate) {
    const today = new Date(targetDate); today.setHours(0, 0, 0, 0);
    const start = new Date(task.start); start.setHours(0, 0, 0, 0);
    const end = new Date(task.end); end.setHours(0, 0, 0, 0);

    if (today > end) return 'status-completed';
    else if (today >= start && today <= end) return 'status-started';
    else if (today < start) {
        const diffDays = Math.ceil(Math.abs(start - today) / (1000 * 60 * 60 * 24)); 
        if (diffDays <= 3) return 'status-commit';
        else if (diffDays <= 7) return 'status-enable';
    }
    return 'status-none';
}

document.getElementById('btnRunTimeline').addEventListener('click', async function () {
    const btn = document.getElementById('btnRunTimeline');
    const simInput = document.getElementById('simulatedToday');

    if (isRunning) {
        clearInterval(timelineInterval);
        isRunning = false;
        btn.innerHTML = "▶ Run Timeline";
        btn.style.backgroundColor = "#4CAF50";
        renderWorkspace(); 
        return;
    }

    let minDate = new Date(8640000000000000); 
    let maxDate = new Date(-8640000000000000); 
    let hasModels = false;

    tasks.forEach(t => {
        if (t.modelObjects && t.modelObjects.length > 0) {
            hasModels = true;
            let s = new Date(t.start); let e = new Date(t.end);
            if (s < minDate) minDate = s;
            if (e > maxDate) maxDate = e;
        }
    });

    if (!hasModels) {
        alert("⚠️ Bạn chưa gán 3D cho công việc nào. Vui lòng Select Model trước khi Run!");
        return;
    }

    if (!currentDateTracker || currentDateTracker > maxDate || currentDateTracker < minDate) {
        currentDateTracker = new Date(minDate);
        currentDateTracker.setDate(currentDateTracker.getDate() - 5); 
    }

    if (typeof TrimbleConnectWorkspace === 'undefined') {
        alert("⚠️ Tính năng này chỉ chạy bên trong môi trường Trimble Connect!");
        return;
    }

    let API;
    try { API = await TrimbleConnectWorkspace.connect(window.parent); } 
    catch (err) { alert("⚠️ Lỗi kết nối API!"); return; }

    await API.viewer.setSelection([]);
    try { if (API.viewer.resetColors) await API.viewer.resetColors(); } catch (err) {}

    isRunning = true;
    btn.innerHTML = "⏸ Pause Timeline";
    btn.style.backgroundColor = "#f44336"; 

    timelineInterval = setInterval(async () => {
        const isoDate = currentDateTracker.toISOString().split('T')[0];
        simInput.value = isoDate;

        let allColorRequests = [];
        
        for (let i = 0; i < tasks.length; i++) {
            let task = tasks[i];
            if (task.modelObjects && task.modelObjects.length > 0) {
                const statusClass = getFastStatusForDate(task, currentDateTracker);
                
                const dot = document.getElementById(`dot-${i}`);
                if (dot) dot.className = `task-status-dot ${statusClass}`;

                const rgbColor = colorMap[statusClass];
                if (rgbColor) {
                    task.modelObjects.forEach(obj => {
                        allColorRequests.push({
                            modelId: obj.modelId,
                            objectRuntimeIds: obj.objectRuntimeIds,
                            color: rgbColor
                        });
                    });
                }
            }
        }
        
        try {
            if (allColorRequests.length > 0) {
                await API.viewer.setColors(allColorRequests);
            }
        } catch(e) {
            console.warn("Có lỗi nhỏ khi Auto-play:", e);
        }

        currentDateTracker.setDate(currentDateTracker.getDate() + 1);

        if (currentDateTracker > maxDate) {
            currentDateTracker.setDate(currentDateTracker.getDate() + 5); 
            clearInterval(timelineInterval);
            isRunning = false;
            btn.innerHTML = "▶ Run Timeline";
            btn.style.backgroundColor = "#4CAF50";
            renderWorkspace(); 
        }
    }, 400); 
});