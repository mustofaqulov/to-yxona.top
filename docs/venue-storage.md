# To‘yxona va rasmlarni saqlash

`npm run dev` orqali `http://localhost:3000/admin` sahifasini oching va
**To‘yxona qo‘shish** tugmasidan foydalaning. Nom, shahar, tuman, manzil,
sig‘im va umumiy narx majburiy. Bir mehmon narxi kiritilmasa umumiy narx va
sig‘imdan hisoblanadi.

10 tagacha JPG, PNG yoki WebP rasm yuklash mumkin (har biri 5 MB, jami 30 MB).
HTTP(S) rasm havolalari ham qo‘llanadi. Birinchi rasm katalog kartasida chiqadi;
formadagi **Asosiy qilish** tugmasi bilan uni almashtirish mumkin.

Yangi yozuvlar va yuklangan rasmlar `.data/wedding-halls/` papkasida saqlanadi.
Server qayta ishga tushganda ham shu papka saqlansa ma’lumotlar qoladi.
Bu papka Git’ga kiritilmaydi; zaxira nusxasiga qo‘shing. Tashqi rasm havolalari
ko‘chirib olinmaydi, ular asl manbaga bog‘liq.

Katalog API va batafsil sahifa serverdagi yozuvlarni o‘qiydi. Oldingi brauzer
xotirasidagi demo yozuvlari admin ro‘yxatida qoladi, avtomatik ko‘chirilmaydi.

Admin autentifikatsiyasi hali demo holatda. Shu sababli yangi yozuv yaratish
va tasdiqlash faqat development rejimida, localhost va ayni origin orqali
ruxsat etilgan. Production uchun admin autentifikatsiyasi, doimiy ma’lumotlar
bazasi va rasm saqlash xizmati ulanishi kerak. Ushbu fayl saqlash usuli bitta
mahalliy serverga mo‘ljallangan; serverless yoki bir nechta server uchun emas.
