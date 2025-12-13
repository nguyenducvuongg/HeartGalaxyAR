# Heart Galaxy AR - Hệ Thống Tương Tác Cử Chỉ Tay

Dự án Heart Galaxy AR là một ứng dụng web sử dụng công nghệ thực tế tăng cường (WebAR) để tạo ra các hiệu ứng hình ảnh đẹp mắt dựa trên cử chỉ tay của người dùng. Hệ thống sử dụng Three.js cho đồ họa 3D và MediaPipe Hands để nhận diện bàn tay theo thời gian thực.

## ✨ Tính Năng Chính

- Hệ Thống Hạt (Particle System): Hàng ngàn hạt ánh sáng di chuyển và tạo hình dựa trên cử chỉ tay.
- Hiệu Ứng Thiên Hà: Nền không gian 3D sống động.
- Nhận Diện Cử Chỉ (Gesture Recognition):
  - Giơ 1, 2, 3 ngón tay để hiện các thông điệp khác nhau.
  - Tương tác Hình Trái Tim: Ghép hai tay thành hình trái tim và giữ trong 2 giây để mở khóa chế độ xem thẻ đặc biệt.
  - Khóa/Mở Khóa: Chế độ xem thẻ sẽ được khóa khi mở. Để đóng lại, người dùng cần thực hiện cử chỉ Nắm Tay (Fist).
- Chế Độ Giọng Nói (Voice Mode): Điều khiển văn bản hiển thị bằng giọng nói tiếng Anh.
- Khung 3D Interactive: Hiển thị hình ảnh và video kỷ niệm trong không gian 3D xoay tròn.

## 🚀 Cài Đặt & Chạy Dự Án

Dự án sử dụng [Vite](https://vitejs.dev/) để phát triển và build.

### Yêu cầu

- Node.js (phiên bản mới nhất được khuyến nghị)
- Camera (Webcam) hoạt động

### Các bước

1.  Clone dự án về máy:
    ```bash
    git clone https://github.com/nguyenducvuongg/HeartGalaxyAR.git
    cd HeartGalaxyAR
    ```
2.  Cài đặt thư viện:
    ```bash
    npm install
    ```
3.  Chạy môi trường phát triển (Dev):
    ```bash
    npm run dev
    ```
    Truy cập vào đường dẫn `http://localhost:3000` (hoặc cổng hiển thị trên terminal).

## 📖 Hướng Dẫn Sử Dụng

Sau khi cấp quyền truy cập Camera, hệ thống sẽ bắt đầu nhận diện tay của bạn.

| Cử chỉ               | Hành động / Hiệu ứng                                 |
| :------------------- | :--------------------------------------------------- |
| 1 Ngón tay       | Hiển thị chữ "I"                                     |
| 2 Ngón tay       | Hiển thị chữ "MISS YOU"                              |
| 3 Ngón tay       | Hiển thị biểu tượng "❤️"                             |
| 4 Ngón tay       | Hiển thị "I MISS YOU"                                |
| Trái Tim (2 Tay) | Giữ 2 giây để hiện khung ảnh kỷ niệm (Lock View) |
| Nắm Tay (Fist)   | Đóng khung ảnh kỷ niệm (Unlock View)                 |
| Mở rộng tay      | Phân tán các hạt (Scatter Effect)                    |

### Chế độ Giọng Nói

- Nhấn nút "Bật Chế độ Giọng nói" trên màn hình.
- Nói bất kỳ từ tiếng Anh nào (ví dụ: "HELLO", "LOVE"), các hạt sẽ xếp thành chữ đó.
- Nói các từ ngắn sẽ hiệu quả hơn.

## 🛠 Công Nghệ Sử Dụng

- [Three.js](https://threejs.org/): Thư viện 3D Javascript mạnh mẽ.
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands): Nhận diện bàn tay và các khớp ngón tay AI của Google.
- Vite: Công cụ build tool siêu tốc.
- CSS3: Tạo giao diện người dùng và hiệu ứng 3D CSS cho thẻ bài.

## 📝 Ghi Chú

- Đảm bảo ánh sáng môi trường tốt để camera nhận diện tay chính xác hơn.
- Nếu không có camera, ứng dụng sẽ chuyển sang chế độ tương tác bằng chuột (Mouse Mode) hạn chế.

---

