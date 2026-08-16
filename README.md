# 🎲 Sòng Phẳng

**Sòng Phẳng** là web app mobile-first để một nhóm bạn ghi kết quả ván chơi, theo dõi số dư theo thời gian thực và rút gọn các khoản cần chuyển khi chốt sổ.

> Mục tiêu của app là **ghi chép minh bạch**. App không xử lý tiền, không xác nhận giao dịch ngân hàng và không thay thế trách nhiệm tuân thủ pháp luật tại nơi sử dụng.

## ✨ Bản Four Seasons

Giao diện không còn khóa vào Tết. App có 4 theme **Xuân / Hạ / Thu / Đông**, tự chọn theo tháng trên thiết bị hoặc cho phép đổi thủ công. Theme được lưu cục bộ để lần sau vẫn giữ lựa chọn.

Các flow chính đã được làm lại cho mobile:

- **Tạo phòng:** host được thêm vào phòng ngay trong cùng batch tạo phòng.
- **Vào phòng:** tối đa 4 người; vào lại bằng cùng Firebase anonymous UID không reset điểm.
- **Tiến Lên:** chủ phòng xếp đủ 4 hạng, thêm tiền phạt và app kiểm tra zero-sum.
- **Xì Dách:** nhập phần thắng/thua của người chơi; phần nhà cái được tính tự động để tổng bằng 0.
- **Undo:** chỉ hoàn tác **ván gần nhất**, tránh tạo trùng số thứ tự ván.
- **Rời phòng:** chỉ đổi trạng thái presence, không xóa player/số dư khỏi sổ.
- **Chốt sổ:** cấn nợ thành các khoản chuyển trực tiếp và tạo VietQR cho người nhận.
- **Ledger là nguồn sự thật:** bảng điểm và chốt sổ được tái dựng từ lịch sử ván; `currentScore` trong player document chỉ còn là field tương thích dữ liệu cũ.
- **Đóng sổ:** chuyển phòng sang `closed` nhưng **không xóa lịch sử**, để còn đối soát.

## 🧠 Quy tắc tính tiền

### Tiến Lên

Hiện tại app hỗ trợ phòng **đúng 4 người** với hai chế độ:

1. **Nhất ăn Bét · Nhì ăn Ba**
2. **Nhất ăn tất** — mỗi người còn lại trả `baseBet` cho người về Nhất.

Tiền phạt được trả cho người về Nhất. Người về Nhất không thể tự phạt chính mình.

### Xì Dách

Host là nhà cái. Host chỉ cần nhập số dư của những người chơi khác:

- số dương: người chơi thắng nhà cái;
- số âm: người chơi thua nhà cái;
- số 0: hòa.

App tự tính số dư host bằng số đối của tổng còn lại.

### Cấn nợ

Khi tổng số dư bằng 0, app ghép người nợ lớn với người được nhận lớn để rút gọn luồng chuyển tiền. Đây là thuật toán greedy để tạo danh sách thanh toán gọn, **không tuyên bố nghiệm tối thiểu toán học trong mọi trường hợp**.

Nếu tổng số dư bị lệch, app **không tự bù**. Màn hình chốt sổ sẽ chặn VietQR và yêu cầu sửa dữ liệu trước.

## 🔐 Firebase & dữ liệu

Stack:

- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/Radix UI
- Zustand persist
- Firebase Anonymous Auth + Firestore realtime
- VietQR image URL
- Vercel

Firebase web config đã được chuyển khỏi source code sang biến môi trường `VITE_FIREBASE_*` để tách cấu hình theo môi trường. Lưu ý: biến `VITE_*` vẫn được Vite đóng gói vào client, nên đây **không phải kho bí mật**.

> Firebase web API key không phải là lớp authorization. **Firestore Security Rules mới là ranh giới quyền truy cập quan trọng.** Repo có file `firestore.rules` để deploy cùng project Firebase; hãy giữ API key giới hạn cho đúng các API Firebase cần dùng.

Thông tin ngân hàng được lưu trong player document của phòng để các **thành viên cùng phòng** có thể tạo VietQR lúc chốt sổ. Không nên dùng app cho dữ liệu tài chính nhạy cảm ngoài mục đích này.

### Biến môi trường

Copy file mẫu:

```bash
cp .env.example .env.local
```

Điền các giá trị Firebase project:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

`.env.local` đã nằm trong `.gitignore` và **không được commit**.

### Firebase Console

1. Bật **Authentication → Anonymous**.
2. Tạo Firestore database.
3. Deploy rules trong repo:

```bash
firebase deploy --only firestore:rules
```

Nếu không dùng Firebase CLI, copy nội dung `firestore.rules` vào Firestore Rules trên Firebase Console và publish.

> **Migration:** phòng đang mở từ bản cũ nên được tạo lại. Bản Four Seasons thêm `metadata.playerCount` và dùng transaction ledger làm nguồn số dư.

## 🧪 Kiểm tra

```bash
npm ci
npm run test
npm run lint
npm run build
```

Chạy toàn bộ test/lint/build:

```bash
npm run check
```

Release gate khuyến nghị (thêm audit dependency production):

```bash
npm run verify
```

`npm run verify` phải xanh trước khi deploy. Nếu bạn quản lý Firestore Rules trực tiếp bằng Firebase Console thì **không cần cài Firebase CLI**; chỉ cần bảo đảm file `firestore.rules` trong repo luôn đồng bộ với rules đã Publish trên Console.

Regression tests hiện kiểm tra các invariant chính:

- Tiến Lên luôn zero-sum;
- phạt vẫn bảo toàn tiền;
- rank trùng bị từ chối;
- Xì Dách tự cân bằng nhà cái;
- cấn nợ từ chối ledger bị lệch;
- VietQR chuẩn hóa số tiền;
- ledger tái dựng số dư thay vì tin `currentScore` denormalized;
- auto theme chọn đúng mùa và manual override hoạt động.

## 🚀 Deploy Vercel

1. Import repo vào Vercel.
2. Framework Preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Khai báo toàn bộ `VITE_FIREBASE_*` trong **Project → Settings → Environment Variables**.
6. Deploy.
7. Firebase rules phải được publish riêng bằng Firebase Console/CLI; Vercel không tự deploy Firestore Rules.

## 📱 Hành vi trình duyệt

- Dashboard yêu cầu Screen Wake Lock khi trình duyệt hỗ trợ.
- App phát hiện các in-app browser phổ biến (Zalo/Facebook/Messenger/Instagram/WeChat/LINE) và khuyến nghị mở bằng Safari/Chrome/Edge.
- Presence dùng heartbeat; trạng thái online là tín hiệu tiện ích, không phải chứng cứ tuyệt đối về kết nối.

## Giới hạn có chủ ý

- Tối đa 4 người/phòng.
- Poker vẫn được giữ trong type để tương thích dữ liệu cũ nhưng **không cho tạo phòng Poker mới**.
- Đơn vị tính điểm là **nghìn đồng nguyên** (`10` = `10.000 VND`) để Firestore Rules có thể xác minh zero-sum deterministically.
- App không có backend tin cậy để khôi phục danh tính sau khi người dùng xóa toàn bộ Firebase/local browser state. Tính năng PIN cũ đã được bỏ thay vì duy trì một cơ chế khôi phục yếu và gây cảm giác an toàn giả.

---

**Sòng Phẳng — chơi vui, ghi rõ, chốt gọn.**
