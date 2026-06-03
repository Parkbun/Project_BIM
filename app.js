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

// ==========================================
// 2. XỬ LÝ GIAO DIỆN & LOGIC CƠ BẢN
// ==========================================
function deleteTask(index) {
    tasks.splice(index, 1);
    tasks.forEach((t, i) => { t.id = "T" + (i + 1); });
    renderWorkspace();
}

function renderWorkspace() {
    localStorage.setItem('bim_ai_tasks', JSON.stringify(tasks));

    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    if (tasks.length === 0) {
        tbody.innerHTML = `<tr style="height: 100px !important;">
            <td colspan="10" style="text-align:center; white-space: normal; color: #888; font-style: italic; border: none;">
                Bảng đang trống. Hãy dùng nút "Nhập từ MS Project" để dán dữ liệu vào đây!
            </td>
        </tr>`;
        document.getElementById("gantt-target").innerHTML = "";
        return;
    }

    tasks.forEach((task, index) => {
        const tr = document.createElement("tr");
        if (task.level === 0) tr.classList.add('summary-task');

        let displayPred = task.rawDependencies !== undefined ? task.rawDependencies : (task.dependencies || "");

        const modelDisplayText = task.modelDisplayName ? task.modelDisplayName : "select model";
        const modelStyle = task.modelDisplayName ? "color: #e65100; text-decoration: none; font-weight: bold;" : "";

        tr.innerHTML = `
            <td class="col-id">${index + 1}</td>
            <td class="col-icon"><span class="task-mode-icon"></span></td>
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
        btnDelete.className = 'btn-delete';
        btnDelete.title = 'Xóa dòng này';
        btnDelete.innerHTML = '🗑️';
        btnDelete.onclick = function () { deleteTask(index); };

        tdAction.appendChild(btnDelete);
        tbody.appendChild(tr);
    });

    document.getElementById("gantt-target").innerHTML = "";
    try {
        if (tasks.length > 0) {
            gantt = new Gantt("#gantt-target", tasks, ganttOptions);

            setTimeout(() => {
                const ganttHeaderBkg = document.querySelector('#gantt-target .header-bkg');
                if (ganttHeaderBkg) {
                    const rHeight = ganttHeaderBkg.getBoundingClientRect().height;
                    const trHead = document.querySelector('#projectTable thead tr');
                    if (trHead) trHead.style.setProperty('height', rHeight + 'px', 'important');
                    const ths = document.querySelectorAll('#projectTable thead th');
                    ths.forEach(th => th.style.setProperty('height', rHeight + 'px', 'important'));
                }

                const ganttGridRows = document.querySelectorAll('#gantt-target .grid-row');
                const tableBodyRows = document.querySelectorAll('#tableBody tr');
                if (ganttGridRows.length > 0 && tableBodyRows.length > 0) {
                    const rRowHeight = ganttGridRows[0].getBoundingClientRect().height;
                    tableBodyRows.forEach(tr => {
                        tr.style.setProperty('height', rRowHeight + 'px', 'important');
                        tr.querySelectorAll('td').forEach(td => {
                            td.style.setProperty('height', rRowHeight + 'px', 'important');
                        });
                    });
                }
                const gContainer = document.querySelector('.gantt-container');
                const gSvg = document.getElementById('gantt-target');
                if (gContainer && gSvg) {
                    const boxWidth = gContainer.clientWidth;
                    const currentSvgWidth = parseFloat(gSvg.getAttribute('width') || 0);
                    
                    if (boxWidth > currentSvgWidth) {
                        gSvg.setAttribute('width', boxWidth);
                        const rects = gSvg.querySelectorAll('.grid-bg, .grid-row, .grid-header');
                        rects.forEach(rect => rect.setAttribute('width', boxWidth));
                    }
                }
            }, 50);
        }
    } catch (error) {
        console.error("Lỗi vẽ biểu đồ:", error);
    }
}

renderWorkspace();

document.getElementById('btnAddTask').addEventListener('click', function () {
    const nameVal = document.getElementById('taskName').value.trim();
    const startVal = document.getElementById('taskStart').value;
    const endVal = document.getElementById('taskEnd').value;
    const levelVal = parseInt(document.getElementById('taskLevel').value);

    if (!nameVal || !startVal || !endVal) return;

    tasks.push({
        id: "T" + (tasks.length + 1),
        name: nameVal, start: startVal, end: endVal,
        progress: 0, rawDependencies: "", dependencies: "",
        level: levelVal, isSummary: levelVal < 2,
        custom_class: levelVal < 2 ? "bar-summary" : "bar-detail"
    });

    renderWorkspace();
    document.getElementById('taskName').value = "";
    document.getElementById('taskName').focus();
});

// ==========================================
// 3. TÍNH NĂNG SMART PASTE & AI PARSER
// ==========================================
document.getElementById('btnTogglePaste').addEventListener('click', function () {
    document.getElementById('pasteArea').style.display = 'block';
    document.getElementById('pasteInput').focus();
});
document.getElementById('btnClosePaste').addEventListener('click', function () {
    document.getElementById('pasteArea').style.display = 'none';
    document.getElementById('pasteInput').value = '';
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
            if (col.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/)) {
                dateCols.push({ index: idx, value: col });
            }
        });

        if (dateCols.length >= 2) {
            let startIdx = dateCols[0].index;
            let endIdx = dateCols[1].index;

            startVal = parseExcelDate(dateCols[0].value);
            endVal = parseExcelDate(dateCols[1].value);

            for (let i = startIdx - 1; i >= 0; i--) {
                let text = cols[i].trim();
                if (text && !text.toLowerCase().includes('day') && !text.toLowerCase().includes('scheduled') && !text.match(/^\d+(\.\d+)?$/)) {
                    nameVal = text;
                    break;
                }
            }
            if (!nameVal) nameVal = cols[0].trim();

            if (cols.length > endIdx + 1) {
                predVal = cols[endIdx + 1].trim();
            }

            if (nameVal && startVal && endVal && !startVal.includes("undefined")) {
                tasks.push({
                    id: "T" + (tasks.length + 1),
                    name: nameVal, start: startVal, end: endVal, progress: 0,
                    rawDependencies: predVal, dependencies: cleanDependencies(predVal),
                    level: 2, isSummary: false, custom_class: "bar-detail"
                });
                isAdded = true;
            }
        }
    });

    if (isAdded) {
        renderWorkspace();
    } else {
        alert("Lỗi: Không tìm thấy cột ngày tháng hợp lệ. Hãy kiểm tra lại dữ liệu Copy!");
    }
}

document.getElementById('btnConfirmPaste').addEventListener('click', function () {
    const text = document.getElementById('pasteInput').value;
    if (text) {
        processPastedData(text);
        document.getElementById('pasteArea').style.display = 'none';
        document.getElementById('pasteInput').value = '';
    }
});

document.addEventListener('paste', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('Text');
    if (pastedText) processPastedData(pastedText);
});

// ==========================================
// 4. XỬ LÝ GÁN MÔ HÌNH 3D TỪ TRIMBLE CONNECT (LẤY TÊN LAYER)
// ==========================================
async function select3DModel(taskIndex) {
    try {
        if (typeof TrimbleConnectWorkspace === 'undefined') {
            alert("Không tìm thấy Trimble Connect API. Đảm bảo ứng dụng đang mở trong Trimble Connect.");
            return;
        }

        const API = await TrimbleConnectWorkspace.connect(window.parent);
        const selection = await API.viewer.getSelection();

        const hasSelection = selection && selection.length > 0 && selection.some(model => model.objectRuntimeIds && model.objectRuntimeIds.length > 0);

        if (!hasSelection) {
            alert("⚠️ Bạn chưa chọn khối 3D nào! Vui lòng click chọn khối 3D trên mô hình (khối sáng viền vàng) trước khi bấm gán.");
            return;
        }

        let totalSelected = 0;
        let firstModelId = null;
        let firstObjectId = null;

        selection.forEach(model => {
            if (model.objectRuntimeIds && model.objectRuntimeIds.length > 0) {
                totalSelected += model.objectRuntimeIds.length;
                if (!firstModelId) {
                    firstModelId = model.modelId;
                    firstObjectId = model.objectRuntimeIds[0];
                }
            }
        });

        let modelName = "Object";
        try {
            if (firstModelId && firstObjectId !== null) {
                const objectProps = await API.viewer.getObjectProperties(firstModelId, [firstObjectId]);

                if (objectProps && objectProps.length > 0) {
                    const obj = objectProps[0];
                    let foundLayer = null;

                    if (obj.properties && Array.isArray(obj.properties)) {
                        for (let pset of obj.properties) {
                            if (pset.properties && Array.isArray(pset.properties)) {
                                let layerProp = pset.properties.find(p => p.name && p.name.toLowerCase().includes('layer'));
                                if (layerProp) {
                                    foundLayer = layerProp.value;
                                    break;
                                }
                            }
                        }
                    }

                    if (foundLayer) {
                        modelName = foundLayer;
                    } else if (obj.class) {
                        modelName = obj.class.replace(/^Ifc/, '');
                    }
                }
            }
        } catch (err) {
            console.warn("Không trích xuất được tên Layer, dùng tên mặc định.", err);
        }

        const task = tasks[taskIndex];
        task.modelObjects = selection;
        task.modelDisplayName = `(${totalSelected}) ${modelName}`;

        renderWorkspace();

    } catch (error) {
        console.error("Lỗi khi kết nối với Trimble Connect:", error);
        alert("Có lỗi xảy ra khi lấy dữ liệu từ mô hình. Bạn ấn F12 xem tab Console để biết chi tiết nhé.");
    }
}