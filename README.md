# 🎲 Sòng Phẳng — Four Seasons

**Sòng Phẳng** là web app mobile-first giúp một nhóm bạn **ghi kết quả từng ván, theo dõi số dư theo thời gian thực và chốt sổ gọn hơn** sau cuộc chơi.

> **Bản hiện tại đang được mở để test thực tế.** Nếu bạn dùng thử, điều mình cần nhất là feedback về việc tạo/vào phòng, cập nhật realtime, nhập điểm, reload trang, Undo và chốt sổ.

🌐 **Dùng thử:** https://fair-game-casino.vercel.app

---

## Sòng Phẳng dùng để làm gì?

Khi chơi theo nhóm, phần dễ rối nhất thường không phải luật chơi mà là **ai đang lời, ai đang lỗ, ván vừa rồi tính thế nào và cuối cùng ai cần chuyển cho ai**.

Sòng Phẳng tập trung vào đúng phần đó:

- tạo một phòng chung bằng mã ngắn;
- tối đa 4 người cùng theo dõi trạng thái phòng;
- ghi kết quả từng ván;
- tự kiểm tra tổng điểm không bị lệch;
- cập nhật dữ liệu realtime giữa các máy;
- Undo ván gần nhất nếu nhập nhầm;
- tổng hợp số dư từ toàn bộ lịch sử ván;
- cấn nợ khi chốt sổ;
- hỗ trợ tạo VietQR cho khoản cần thanh toán.

**App chỉ là công cụ ghi chép.** Sòng Phẳng không giữ tiền, không thực hiện giao dịch ngân hàng và không xác nhận một khoản chuyển tiền đã hoàn tất.

---

## ✨ Four Seasons

Phiên bản mới có 4 giao diện:

- 🌸 **Xuân**
- ☀️ **Hạ**
- 🍂 **Thu**
- ❄️ **Đông**

App có thể tự chọn theme theo thời gian trên thiết bị, hoặc bạn có thể đổi thủ công trong phần giao diện. Lựa chọn thủ công được ghi nhớ trên trình duyệt.

---

## 🚀 Cách dùng nhanh

### 1. Mở app và tạo hồ sơ

Nhập tên hiển thị của bạn. Nếu muốn dùng VietQR khi chốt sổ, bạn có thể bổ sung thông tin nhận tiền trong hồ sơ.

### 2. Một người tạo phòng

Người tạo phòng trở thành **chủ phòng (host)** và được thêm vào danh sách người chơi ngay khi phòng được tạo.

App sẽ tạo một **mã phòng 5 ký tự** để chia sẻ cho những người còn lại.

### 3. Những người khác vào bằng mã phòng

Mỗi người mở Sòng Phẳng trên máy hoặc phiên trình duyệt của mình, chọn **Vào bằng mã phòng** và nhập mã được host gửi.

Khi hoạt động bình thường, người mới tham gia sẽ xuất hiện trên các máy khác **mà không cần reload trang**.

### 4. Ghi kết quả từng ván

Host nhập kết quả. App kiểm tra dữ liệu trước khi ghi vào sổ để tránh những round bị lệch tổng.

### 5. Nếu nhập sai, dùng Undo

Undo chỉ hoàn tác **ván gần nhất**. Các ván trước đó vẫn được giữ nguyên.

### 6. Chốt sổ

Khi kết thúc, app tính lại số dư từ lịch sử ván rồi rút gọn thành các khoản cần chuyển giữa những người chơi.

Nếu thông tin ngân hàng của người nhận đã được nhập, app có thể tạo VietQR tương ứng.

---

## 🎮 Trò chơi đang hỗ trợ

### Tiến Lên

Hiện tại Tiến Lên được thiết kế cho **đủ 4 người**.

Có hai cách tính chính:

1. **Nhất ăn Bét · Nhì ăn Ba**
2. **Nhất ăn tất** — những người còn lại trả mức cược cơ bản cho người về Nhất.

Host xếp hạng người chơi sau mỗi ván và có thể thêm tiền phạt. App kiểm tra để tổng thay đổi của cả ván luôn bằng 0.

### Xì Dách

Host đóng vai trò **nhà cái**.

Với mỗi người chơi còn lại:

- số dương: người chơi thắng nhà cái;
- số âm: người chơi thua nhà cái;
- `0`: hòa.

App tự tính phần thay đổi của nhà cái để tổng cả ván bằng 0.

### Poker

Poker **chưa được hỗ trợ như một chế độ chơi hoàn chỉnh** trong bản release này.

---

## 💰 Số dư được tính như thế nào?

Sòng Phẳng không coi con số đang hiển thị trên một player là “nguồn sự thật” độc lập.

Mỗi ván được ghi vào **lịch sử giao dịch (ledger)**. Số dư hiện tại được dựng lại bằng cách cộng toàn bộ thay đổi của người chơi qua các ván.

Ví dụ:

```text
Ván 1
An   +50
Bình -50

Ván 2
An   -20
Bình +20

Số dư hiện tại
An   +30
Bình -30
```

Nhờ vậy, lịch sử ván có thể được dùng để đối chiếu lại số dư khi cần.

### Đơn vị hiển thị

App dùng **nghìn đồng** làm đơn vị nhập điểm:

```text
10  = 10.000 VND
50  = 50.000 VND
100 = 100.000 VND
```

---

## 🧾 Cấn nợ và VietQR

Khi tổng số dư của phòng bằng 0, app rút gọn các khoản nợ thành danh sách chuyển tiền trực tiếp giữa người trả và người nhận.

Ví dụ thay vì nhiều khoản chuyển vòng qua nhau, app cố gắng tạo một danh sách thanh toán ngắn và dễ thực hiện hơn.

Nếu ledger bị lệch tổng, app **không tự bù số tiền bị thiếu**. Việc chốt sổ/VietQR sẽ bị chặn để người chơi kiểm tra lại dữ liệu trước.

> VietQR chỉ giúp tạo thông tin thanh toán. App không biết một giao dịch ngân hàng đã thực sự được chuyển hay chưa.

---

## 🔄 Realtime, reload và trạng thái online

Sòng Phẳng dùng Firebase để đồng bộ phòng giữa các thiết bị.

Trong một phiên chơi bình thường:

- người mới vào phòng sẽ xuất hiện realtime;
- ván mới sẽ cập nhật trên các máy đang mở;
- Undo sẽ cập nhật cho các thành viên khác;
- khi reload trang trên cùng trình duyệt, app cố gắng khôi phục lại phòng đang tham gia;
- trạng thái online được cập nhật bằng heartbeat.

Trạng thái **online/offline chỉ mang tính tiện ích**, không phải bằng chứng tuyệt đối rằng một người vẫn đang nhìn vào màn hình.

---

## 🧪 Bản test công khai — mình cần bạn thử gì?

Nếu bạn muốn hỗ trợ test, một lượt test có ích nhất là dùng **2 trình duyệt/2 thiết bị độc lập** và thử lần lượt:

1. Máy A tạo phòng.
2. Máy B vào bằng mã phòng.
3. Kiểm tra A thấy B xuất hiện realtime.
4. Nhập một ván hợp lệ và xem cả hai máy có cập nhật giống nhau không.
5. Thử nhập dữ liệu sai/lệch tổng và kiểm tra app có từ chối không.
6. Reload cả A và B, kiểm tra cả hai có trở lại đúng phòng không.
7. Tạo thêm vài ván rồi Undo ván gần nhất.
8. Kiểm tra số dư sau Undo.
9. Chốt sổ và kiểm tra các khoản cần chuyển.
10. Nếu có dùng VietQR, kiểm tra tên người nhận, số tiền và thông tin thanh toán.

### Khi gặp bug

Nếu có thể, hãy gửi kèm:

- thiết bị và trình duyệt đang dùng;
- thao tác ngay trước khi lỗi xảy ra;
- bạn mong đợi điều gì;
- app thực tế đã làm gì;
- ảnh chụp màn hình;
- ảnh Console/Network nếu bạn biết mở DevTools.

Nếu báo lỗi liên quan đến phòng, mã phòng cũng hữu ích để mô tả tình huống — nhưng **đừng đăng công khai thông tin ngân hàng hoặc dữ liệu cá nhân nhạy cảm**.

---

## 🔐 Dữ liệu và quyền riêng tư

Sòng Phẳng hiện dùng **Firebase Anonymous Authentication**. Điều này cho phép app nhận biết một phiên người dùng mà không yêu cầu tạo tài khoản bằng email/mật khẩu.

Một số điều nên biết:

- dữ liệu phòng được lưu trên Firestore;
- thành viên trong cùng phòng cần đọc dữ liệu cần thiết để hiển thị bảng điểm và chốt sổ;
- nếu bạn nhập thông tin ngân hàng để nhận VietQR, thông tin đó được dùng trong ngữ cảnh phòng để tạo khoản thanh toán;
- không nên nhập dữ liệu tài chính nhạy cảm ngoài những thông tin tối thiểu cần cho việc nhận chuyển khoản;
- nếu bạn xóa toàn bộ dữ liệu site/browser hoặc làm mất Firebase anonymous identity, app có thể không nhận ra bạn là cùng một người chơi cũ.

**Firebase web API key không phải mật khẩu của database.** Quyền đọc/ghi dữ liệu được kiểm soát bằng Firestore Security Rules.

---

## 📱 Trình duyệt khuyến nghị

Nên mở bằng trình duyệt đầy đủ như:

- Chrome
- Edge
- Safari
- Firefox

Các trình duyệt nhúng bên trong Zalo, Facebook, Messenger, Instagram, WeChat hoặc LINE có thể hạn chế một số API của trình duyệt. Nếu app phát hiện môi trường như vậy, hãy chọn **Mở bằng trình duyệt** nếu có thể.

App cũng sử dụng Screen Wake Lock khi trình duyệt hỗ trợ để hạn chế việc màn hình tự tắt trong lúc đang theo dõi phòng.

---

## ⚠️ Giới hạn hiện tại

- Tối đa **4 người/phòng**.
- Tiến Lên hiện yêu cầu **đúng 4 người**.
- Poker chưa mở như một game mode hoàn chỉnh.
- Anonymous identity phụ thuộc vào dữ liệu trình duyệt; xóa toàn bộ site data có thể làm mất khả năng nhận diện phiên cũ.
- VietQR không xác nhận giao dịch đã thanh toán.
- App đang trong giai đoạn test thực tế, vì vậy vẫn có thể còn edge case ở realtime, reconnect, trình duyệt di động hoặc Firestore Rules.

---

## 🛠️ Dành cho người muốn chạy source

Phần dưới đây dành cho developer/contributor. Người chỉ muốn dùng thử app có thể bỏ qua.

### Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/Radix UI
- Zustand
- Firebase Anonymous Auth
- Cloud Firestore realtime
- Vercel

### Cài dependencies

```bash
npm ci
```

### Firebase environment variables

Tạo `.env.local` từ `.env.example` và điền cấu hình Firebase Web App:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

`.env.local` **không được commit**.

Trong Firebase Console cần:

1. bật **Authentication → Anonymous**;
2. tạo Firestore database;
3. publish `firestore.rules`;
4. thêm production domain vào **Authentication → Settings → Authorized domains** nếu cần dùng các OAuth flow sau này.

Firebase CLI không bắt buộc nếu rules được copy/publish trực tiếp trong Firebase Console.

### Chạy local

```bash
npm run dev
```

### Release gate

```bash
npm run verify
```

`npm run verify` chạy regression tests, lint, production build và audit production dependencies. Không nên deploy một thay đổi nếu gate này chưa xanh.

### Deploy

Project hiện phù hợp với Vercel/Vite:

```text
Build command:     npm run build
Output directory:  dist
```

Các biến `VITE_FIREBASE_*` cần được khai báo trong Vercel Environment Variables cho môi trường production. Firestore Rules được publish riêng qua Firebase Console hoặc Firebase CLI; Vercel không tự deploy rules.

---

## ❤️ Cảm ơn bạn đã test

Một bug report rõ ràng có giá trị hơn rất nhiều so với câu “app bị lỗi”. Nếu bạn dành vài phút chơi thử bằng hai thiết bị, reload giữa chừng, nhập sai một ván hoặc thử Undo/chốt sổ, feedback đó sẽ giúp Sòng Phẳng ổn định nhanh hơn.

**Sòng Phẳng — chơi vui, ghi rõ, chốt gọn.**