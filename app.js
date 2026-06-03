// Khởi tạo danh sách dữ liệu mẫu chính xác theo file thực tế của Bủn
const projectTasks = [
    { name: "DỰ ÁN: KHU TÁI ĐỊNH CƯ PHỤC VỤ CHÍNH T...", mode: "■", duration: "252 days", start: "01/04/26", finish: "09/12/26", pred: "", resource: "", model: "select model" },
    { name: "I. HẠNG MỤC: NỀN", mode: "■", duration: "50 days", start: "01/04/26", finish: "20/05/26", pred: "", resource: "", model: "select model" },
    { name: "NỀN ĐƯỜNG", mode: "■", duration: "50 days", start: "01/04/26", finish: "20/05/26", pred: "", resource: "", model: "select model" },
    { name: "Đào đất nền đường", mode: "■", duration: "25 days", start: "01/04/26", finish: "25/04/26", pred: "", resource: "", model: "select model" },
    { name: "Đắp đất nền đường", mode: "■", duration: "45 days", start: "06/04/26", finish: "20/05/26", pred: "4SS+5 days", resource: "", model: "select model" },
    { name: "II. HẠNG MỤC: THOÁT NƯỚC", mode: "■", duration: "216 days", start: "11/04/26", finish: "12/11/26", pred: "", resource: "", model: "select model" },
    { name: "HỐ GA", mode: "■", duration: "45 days", start: "11/04/26", finish: "25/05/26", pred: "", resource: "", model: "select model" }
];

document.addEventListener("DOMContentLoaded", () => {
    // Gọi hàm đổ dữ liệu lên màn hình ngay khi tải trang xong
    renderWorkspaceData(projectTasks);
});

function renderWorkspaceData(tasks) {
    const tableBody = document.getElementById("taskTableBody");
    const ganttBody = document.getElementById("ganttBody");
    
    // Xóa sạch dữ liệu cũ trước khi nạp mới
    tableBody.innerHTML = "";
    ganttBody.innerHTML = "";

    tasks.forEach((task, index) => {
        const rowNumber = index + 1;

        // BƯỚC 1: TẠO DÒNG TRONG BẢNG THÔNG TIN PHÍA TRÊN
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="text-align: center;"><b>${rowNumber}</b></td>
            <td style="color: #1a73e8; text-align: center; font-size: 10px;">${task.mode}</td>
            <td style="font-weight: ${task.name.includes('HẠNG MỤC') || task.name.includes('DỰ ÁN') ? 'bold' : 'normal'}">${task.name}</td>
            <td>${task.duration}</td>
            <td>${task.start}</td>
            <td>${task.finish}</td>
            <td style="color: green; font-weight: bold;">${task.pred}</td>
            <td>${task.resource}</td>
            <td><a href="#" style="color: #1a73e8; text-decoration: none;">${task.model}</a></td>
        `;
        tableBody.appendChild(tr);

        // BƯỚC 2: TẠO DÒNG TRONG BIỂU ĐỒ GANTT PHÍA DƯỚI (ĐỒNG BỘ STT)
        const ganttRow = document.createElement("div");
        ganttRow.className = "gantt-row";

        // Thêm cột số thứ tự lề trái cho dòng Gantt
        const indexDiv = document.createElement("div");
        indexDiv.className = "gantt-row-index";
        indexDiv.innerText = rowNumber;
        ganttRow.appendChild(indexDiv);

        // Khung chứa thanh tiến độ
        const timelineCell = document.createElement("div");
        timelineCell.className = "gantt-timeline-cell";

        // Tạo thanh bar màu xanh hiển thị tiến độ
        const bar = document.createElement("div");
        bar.className = "gantt-bar";
        
        // Thuật toán lập trình demo mô phỏng căn độ dài thanh khớp với ảnh thực tế
        if (rowNumber === 1) { 
            bar.style.left = "20px"; bar.style.width = "400px"; 
        } else if (rowNumber === 2 || rowNumber === 3) { 
            bar.style.left = "20px"; bar.style.width = "180px"; 
        } else if (rowNumber === 4) { 
            bar.style.left = "20px"; bar.style.width = "90px"; 
        } else if (rowNumber === 5) { 
            bar.style.left = "60px"; bar.style.width = "140px"; 
            bar.style.backgroundColor = "#29b6f6"; // Cho dòng đắp đất màu xanh sáng nổi bật
        } else if (rowNumber === 6) { 
            bar.style.left = "80px"; bar.style.width = "320px"; 
        } else if (rowNumber === 7) { 
            bar.style.left = "80px"; bar.style.width = "150px"; 
        }

        // Nếu công việc có mối quan hệ liên kết (Predecessors) thì hiện chữ ghi chú ra sau thanh bar
        if (task.pred) {
            bar.innerText = task.pred;
            bar.style.color = "#d32f2f"; // Màu đỏ cho chữ mối quan hệ dễ nhìn
        }

        timelineCell.appendChild(bar);
        ganttRow.appendChild(timelineCell);
        ganttBody.appendChild(ganttRow);
    });
}