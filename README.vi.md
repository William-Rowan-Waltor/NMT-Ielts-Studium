# IELTS Writing Lab

## Ngôn ngữ

[English](README.md) | [Deutsch](README.de.md) | **Tiếng Việt**

Không gian luyện thi IELTS Academic có hỗ trợ AI và ưu tiên chạy cục bộ, bao gồm Writing, Reading, Listening, Speaking, Vocabulary và theo dõi tiến độ.

Ứng dụng chạy trong trình duyệt, hỗ trợ cả nhà cung cấp AI đám mây và mô hình Ollama nằm trong thư mục dự án. Dự án phục vụ mục đích tự học cá nhân và không liên kết với IELTS, Cambridge University Press & Assessment hoặc British Council.

> Tất cả ảnh chụp bên dưới sử dụng dữ liệu minh họa ẩn danh. Dữ liệu học tập cá nhân, API key, cơ sở dữ liệu cục bộ, file mô hình và môi trường chạy không được đưa vào dự án công khai.

![Bảng điều khiển IELTS Writing Lab](screenshots/dashboard.png)

## Các tính năng

### Writing

Luyện Task 1, Task 2 hoặc bài Writing đầy đủ có giới hạn thời gian. Không gian làm bài kết hợp tạo đề, ghi chú lập kế hoạch, micro-drill, viết bài, chấm điểm bằng AI, bài mẫu, phản hồi theo câu, luyện viết lại và lưu lỗi.

![Không gian luyện Writing](screenshots/writing.png)

### Reading

Tạo bài luyện ngắn, từng section hoặc bài thi đầy đủ. Reading hỗ trợ nhiều dạng câu hỏi, kiểm tra đáp án nghiêm ngặt, ghi chú, đánh dấu, tô sáng, bộ đếm giờ và phân tích kết quả.

![Giao diện làm bài Reading](screenshots/reading-test.png)

![Điều khiển tạo bài Reading](screenshots/reading-generate.png)

Tài liệu Reading được tải lên sẽ được xử lý như bài thi hoàn chỉnh. AI được yêu cầu giữ lại toàn bộ passage, hướng dẫn, câu hỏi, lựa chọn, số thứ tự và trật tự ban đầu.

![Dataset và nhập bài Reading hoàn chỉnh](screenshots/reading-dataset.png)

![Trình luyện chiến thuật Reading](screenshots/reading-strategies.png)

### Listening

Tạo các phần Listening theo phong cách IELTS, nhập tài liệu nguồn, xây dựng thư viện cục bộ, luyện với transcript và xem lại đáp án. Speaking backend có thể tạo nhiều giọng đọc cục bộ bằng Supertonic.

![Không gian tạo bài Listening](screenshots/listening.png)

### Speaking

Các bài khởi động và luyện phát âm cơ bản hoạt động không cần backend. Khi sử dụng FastAPI backend tùy chọn, ứng dụng có thư viện câu hỏi, phiên âm bằng Whisper cục bộ, phân tích âm thanh, chấm điểm và lịch sử bài làm.

![Thư viện câu hỏi Speaking](screenshots/speaking.png)

### Vocabulary

Học Academic Word List với lặp lại ngắt quãng, định nghĩa, ví dụ, họ từ, bài điền từ, collocation, từ vựng nhập vào, quiz và bổ sung nội dung bằng AI.

![Thẻ học Vocabulary](screenshots/vocabulary.png)

### Dashboard và Settings

Dashboard tổng hợp kế hoạch học, nhắc nhở, hoạt động hằng ngày, lịch sử điểm, hàng đợi ôn tập và điểm yếu. Settings quản lý mục tiêu, nhà cung cấp AI, mô hình cục bộ, Speaking backend, lưu trữ và nhập/xuất dữ liệu.

![Phân tích tiến độ Dashboard](screenshots/dashboard-progress.png)

![Settings và AI cục bộ](screenshots/settings-local-ai.png)

## Chọn chế độ chạy

| Chế độ | Cách chạy | Phù hợp với | Giới hạn |
|---|---|---|---|
| Mở trực tiếp | Nhấp đúp `index.html` | Khởi động nhanh và luyện tập thông thường | Chỉ dùng bộ nhớ trình duyệt; CORS có thể hạn chế một số chức năng |
| App server cục bộ | `node scripts/serve.mjs` | Khuyến nghị cho sử dụng hằng ngày | Cần Node.js; mở tại `http://localhost:5173` |
| AI trong dự án | `start-local-ai.bat` | Sử dụng AI không cần cloud API key | Windows; cần vài GB dung lượng và đủ RAM/VRAM |
| Speaking backend | `start-speaking-backend.bat` | Chấm Speaking và Listening TTS tùy chọn | Cần Python và `ffmpeg` |

Các chế độ có thể chạy cùng nhau.

## Khởi động nhanh

### Chế độ trình duyệt cơ bản

1. Clone hoặc tải repository.
2. Nhấp đúp `index.html`.
3. Mở **Settings** và thêm nhà cung cấp AI, hoặc dùng các chức năng không cần AI.
4. Xuất bản sao lưu định kỳ tại **Settings > Data Management**.

### App server cục bộ được khuyến nghị

```powershell
node scripts/serve.mjs
```

Mở `http://localhost:5173`. Ứng dụng trình duyệt không yêu cầu chạy `npm install`.

## AI cục bộ trong dự án trên Windows

Repository không chứa runtime hoặc file mô hình có dung lượng nhiều GB. Script thiết lập sẽ tạo Ollama portable và kho mô hình trong thư mục `.local/` đã được Git bỏ qua.

Chạy một lần:

```powershell
.\setup-local-ai.bat
```

Khởi động hoặc dừng:

```powershell
.\start-local-ai.bat
.\stop-local-ai.bat
```

API cục bộ chạy tại `http://localhost:11434`. Việc gỡ Ollama được cài trên hệ thống không ảnh hưởng đến bản Ollama nằm trong dự án.

## Speaking Backend

Thiết lập examiner cục bộ không cần cloud API key:

```powershell
.\setup-local-ai.bat
.\setup-speaking-backend-local.bat
.\start-speaking-backend.bat
```

Cài đặt `ffmpeg` để giải mã âm thanh được ghi từ trình duyệt:

```powershell
winget install Gyan.FFmpeg
```

Xem thêm: [speaking-backend/README.md](speaking-backend/README.md)

## Nhập tài liệu

App server cục bộ có thể sử dụng MarkItDown để chuyển đổi PDF, Word, slide, bảng tính, HTML, CSV và các tài liệu được hỗ trợ khác:

```powershell
node scripts/setup-markitdown.mjs
node scripts/serve.mjs
```

## Dữ liệu và quyền riêng tư

Dự án không có hệ thống tài khoản, dịch vụ phân tích hoặc backend được host sẵn.

| Vị trí | Nội dung | Cách Git xử lý |
|---|---|---|
| `localStorage` của trình duyệt | Tiến độ, bài viết, bài thi, bản nháp và cấu hình API | Không nằm trong thư mục dự án |
| `data/app-state.json` | Bản sao trạng thái học tập tùy chọn | Được Git bỏ qua |
| `speaking-backend/data/` | Dữ liệu SQLite Speaking cục bộ | Được Git bỏ qua |
| `.local/` | Runtime Ollama, mô hình và log | Được Git bỏ qua |
| `markitdown-venv/` | Môi trường Python chuyển đổi tài liệu | Được Git bỏ qua |

AI đám mây, Wikipedia grounding, nhập URL và các tính năng mạng khác sẽ gửi yêu cầu ra ngoài máy. Không commit dữ liệu cá nhân, file `.env`, mô hình, cơ sở dữ liệu, thư mục runtime hoặc API key.

## Phát triển

```powershell
# Build lại ứng dụng sau khi chỉnh sửa src/
node scripts/build.mjs

# Chạy app server cục bộ
node scripts/serve.mjs

# Tạo môi trường nhập tài liệu tùy chọn
node scripts/setup-markitdown.mjs
```

Chỉnh sửa source trong `src/`. `dist/app.jsx` và `index.html` được tạo bởi `scripts/build.mjs`.

## Giới hạn

- Phản hồi AI chỉ hỗ trợ luyện tập và theo dõi xu hướng, không phải điểm IELTS chính thức.
- Câu hỏi do AI tạo hoặc trích xuất vẫn cần con người kiểm tra.
- Chất lượng mô hình cục bộ phụ thuộc vào mô hình và phần cứng.
- Ứng dụng ưu tiên desktop, dành cho một người dùng và không có đồng bộ bằng tài khoản.
- Các tính năng đám mây có thể phát sinh chi phí và chịu giới hạn của nhà cung cấp.
- Người dùng chịu trách nhiệm về quyền sử dụng tài liệu được nhập hoặc phân phối lại.

## Giấy phép

Mã nguồn và tài liệu dự án được cấp phép theo [MIT License](LICENSE). Giấy phép không cấp quyền phân phối lại âm thanh, transcript, passage nhập vào, tài liệu thi sao chép, dataset cá nhân, file xuất của người dùng hoặc API key thuộc bên thứ ba.
