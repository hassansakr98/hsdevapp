# نشر hsdevapp على cPanel (Setup Node.js App)

## 0. التجهيز (على جهازك)
```powershell
powershell -ExecutionPolicy Bypass -File deploy\package-cpanel.ps1
```
بيطلع ملف `hsdevapp-cpanel.zip` بمجلد المشروع.
المفتاح السري وباقي المتغيرات بملف `deploy\cpanel-env.txt` (لا ترفعه على GitHub ولا تشاركه).

## 1. الدومين الفرعي
cPanel ← Domains ← Create A New Domain
- Domain: `app.hsdevapp.com`
- **لا** تعلّم Share document root
- Document Root: `app.hsdevapp.com` (زي ما هو)

## 2. شهادة HTTPS
cPanel ← SSL/TLS Status ← علّم `app.hsdevapp.com` ← **Run AutoSSL**.
لازم تكون الشهادة جاهزة قبل تسجيل الدخول (كوكي الجلسة بيشتغل على HTTPS بس).

## 3. رفع الملفات
cPanel ← File Manager:
1. اعمل مجلد `/home/hsdevapp/hsdevapp-app`
2. ارفع `hsdevapp-cpanel.zip` جواته ← كليك يمين ← **Extract**
3. تأكد إن `server.js` موجود مباشرة جوا `hsdevapp-app` (مش جوا مجلد فرعي)
4. احذف ملف الـ zip بعد الفك

## 4. إنشاء التطبيق
cPanel ← Setup Node.js App ← CREATE APPLICATION:
| الحقل | القيمة |
|---|---|
| Node.js version | 26.13.1 |
| Application mode | **Production** |
| Application root | `hsdevapp-app` |
| Application URL | `app.hsdevapp.com` (والخانة اللي جنبها فاضية) |
| Application startup file | `server.js` |
| Passenger log file | `/home/hsdevapp/logs/hsdevapp.log` |

**Environment variables** ← ADD VARIABLE لكل سطر من `deploy\cpanel-env.txt`:
`AUTH_SECRET` و `DATA_DIR`.

اكبس **CREATE**. ما في داعي لـ "Run NPM Install" — كل المكتبات جوا الـ zip.

## 5. التجربة
افتح `https://app.hsdevapp.com` ← سجّل حساب الشركة.

## التحديث لنسخة جديدة
1. على جهازك: شغّل `package-cpanel.ps1` من جديد
2. File Manager: احذف محتوى `hsdevapp-app` (**مش** `hsdevapp-data`!) وارفع الـ zip الجديد وفكه
3. Setup Node.js App ← **RESTART**

## النسخ الاحتياطي
قاعدة البيانات ملف واحد: `/home/hsdevapp/hsdevapp-data/app.db`.
نزّله من File Manager بشكل دوري، أو فعّل Backup بـ cPanel.

## إذا ما اشتغل
- شوف `/home/hsdevapp/logs/hsdevapp.log`
- تأكد إن AUTH_SECRET مضاف (بدونه التطبيق بيعطي خطأ عند تسجيل الدخول)
