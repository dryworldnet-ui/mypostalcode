/**
 * Static Site Generator for South African Postal Codes
 * Generates crawlable, SEO-friendly HTML pages with real URLs (no hash routing).
 *
 * URL structure:
 *   /                     → Home (search + province list)
 *   /province/{slug}      → Province page (list of towns)
 *   /town/{town}          → Town page (town info + areas)
 *   /town/{town}/{area}   → Area page with postal code card
 *
 * Run: node scripts/generate-static-pages.js
 * Output: dist/ (ready for static hosting)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.SITE_URL || 'https://myzipcode.co.za';

// Preview mode: only generate one province (faster dev). Use --preview or PREVIEW_PROVINCE env.
const previewArg = process.argv.find((a) => a.startsWith('--preview'));
const PREVIEW_PROVINCE =
  process.env.PREVIEW_PROVINCE ||
  (previewArg && previewArg.includes('=') ? previewArg.split('=')[1].replace(/-/g, ' ') : null) ||
  (previewArg ? 'Northern Cape' : null);
const JSON_PATH = fs.existsSync(path.join(ROOT, 'public', 'postal-codes.json'))
  ? path.join(ROOT, 'public', 'postal-codes.json')
  : path.join(ROOT, 'postal-codes.json');
const DIST_PATH = path.join(ROOT, 'dist');

// ----- Slug utilities -----
function toSlug(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'area';
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ----- Shared layout -----
const SHARED_STYLES = fs.readFileSync(
  path.join(ROOT, 'postal-code-search.html'),
  'utf8'
).match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';

const FOOTER_HTML = `
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-grid">
        <div class="footer-section">
          <h3>About</h3>
          <p>This website helps you quickly find South African postal codes by province, town, and area.</p>
          <p>Our goal is to provide a simple, accurate, and easy-to-use reference for individuals, businesses, and developers looking up postal codes across South Africa.</p>
        </div>
        <div class="footer-section">
          <h3>Contact</h3>
          <p>If you notice incorrect information or have suggestions, please contact us:</p>
          <p>Email: <a href="mailto:ontheworkhouse@gmail.com">ontheworkhouse@gmail.com</a></p>
          <p>We aim to keep this data accurate and up to date.</p>
        </div>
        <div class="footer-section">
          <h3>Data Source</h3>
          <p>Postal code data is sourced from the South African Post Office (SAPO) and has been cleaned and structured for public lookup and educational use.</p>
          <p>This site is not affiliated with SAPO.</p>
        </div>
      </div>
      <div class="footer-copyright">
        <strong>Copyright</strong><br>
        © 2026 MyZipCode.co.za — All rights reserved.<br>
        Postal code data remains the property of their respective owners.
      </div>
    </div>
  </footer>
`;

const HEADER_HTML = `
  <header class="hero-header site-header">
    <div class="header-inner">
      <a href="/" class="header-logo"><img src="/icon.png" alt="" /></a>
      <div class="header-text">
        <a href="/" class="hero-title" style="text-decoration:none;color:#fff;">South African Postal Code Search</a>
        <p class="hero-subtitle">Find postal codes for any area across South Africa</p>
      </div>
      <div class="header-spacer" aria-hidden="true"></div>
    </div>
  </header>
`;

// Page loader - white screen with icon spinning 2 times
const PAGE_LOADER = `
  <div id="page-loader" class="page-loader">
    <img src="/icon.png" alt="" class="page-loader__icon" />
  </div>
`;

const PAGE_LOADER_STYLES = `
  .page-loader { position:fixed; inset:0; background:rgba(255,255,255,0.5); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); z-index:99999; display:flex; align-items:center; justify-content:center; transition:opacity 0.3s ease; }
  .page-loader.hidden { opacity:0; pointer-events:none; }
  .page-loader__icon { width:64px; height:64px; animation:loaderSpin 0.6s ease-in-out 1 forwards; }
  @keyframes loaderSpin { to { transform:rotate(360deg); } }
`;

const PAGE_LOADER_SCRIPT = `
  (function(){
    var loader=document.getElementById('page-loader');
    var minTime=600;
    var start=Date.now();
    function hide(){
      if(!loader)return;
      loader.classList.add('hidden');
      setTimeout(function(){ if(loader.parentNode)loader.parentNode.removeChild(loader); }, 350);
    }
    function tryHide(){
      var elapsed=Date.now()-start;
      if(elapsed>=minTime)hide();
      else setTimeout(hide, minTime-elapsed);
    }
    if(document.readyState==='complete')tryHide();
    else window.addEventListener('load',tryHide);
  })();
`;

// AdSense placeholder - replace YOUR_ADSENSE_ID with your actual publisher ID
const ADSENSE_SNIPPET = `
  <!-- Google AdSense - Add your ca-pub-XXXXX ID when approved -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_ADSENSE_ID" crossorigin="anonymous"></script>
`;

function layout(opts) {
  const { title, description, canonical = '', bodyContent } = opts;
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : BASE_URL;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <link rel="icon" type="image/png" href="/icon.png" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${ADSENSE_SNIPPET}
  <style>${SHARED_STYLES}</style>
  <style>
    .header-inner { display:flex; align-items:center; justify-content:space-between; width:100%; }
    .header-logo { flex-shrink:0; display:flex; align-items:center; justify-content:center; width:48px; height:48px; min-width:48px; min-height:48px; background:#fff; border-radius:50%; padding:6px; box-sizing:border-box; }
    .header-logo img { width:100%; height:100%; object-fit:contain; border-radius:50%; }
    .header-text { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:0; }
    .header-spacer { flex-shrink:0; width:48px; height:48px; }
    .area-link, .town-link { display:block; padding:1rem 1.5rem; border-bottom:1px solid #f1f5f9; text-decoration:none; color:inherit; }
    .area-link:hover, .town-link:hover { background:#f8fafc; }
    .area-link:last-child, .town-link:last-child { border-bottom:none; }
    .breadcrumb { font-size:0.9rem; color:#64748b; margin-bottom:1.5rem; word-wrap:break-word; }
    .breadcrumb a { color:#15803d; text-decoration:none; }
    .breadcrumb a:hover { text-decoration:underline; }
    @media (max-width:768px){ .header-logo { width:40px; height:40px; min-width:40px; min-height:40px; padding:5px; } .header-spacer { width:40px; height:40px; } .area-link, .town-link { padding:0.875rem 1rem; min-height:3rem; } .breadcrumb { font-size:0.85rem; } }
    @media (max-width:480px){ .area-link, .town-link { padding:0.75rem; } }
    ${PAGE_LOADER_STYLES}
    .bg-circles{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden}
    .page-with-circles{position:relative;min-height:100vh}
    .bg-circle{position:absolute;border-radius:50%}
    .bg-circle--solid{background:rgba(167,243,208,0.2);border:none}
    .bg-circle--dashed{background:transparent;border:2px dashed rgba(34,197,94,0.3)}
    .bg-circle--gradient{background:linear-gradient(135deg,rgba(251,191,36,0.22),rgba(249,115,22,0.18));border:none}
    .bg-circle--gradient-dashed{background:transparent;border:2px dashed rgba(251,146,60,0.35)}
    .bg-circle--green-gradient{background:linear-gradient(135deg,rgba(74,222,128,0.22),rgba(34,197,94,0.18));border:none}
    .bg-circle--dotted{background:transparent;border:2px dotted rgba(34,197,94,0.35)}
    .bg-circle-1{left:-18%;top:8%;width:42vmin;height:42vmin}
    .bg-circle-2{left:-12%;bottom:25%;width:38vmin;height:38vmin}
    .bg-circle-3{right:-22%;top:15%;width:48vmin;height:48vmin}
    .bg-circle-4{right:-15%;top:50%;width:35vmin;height:35vmin}
    .bg-circle-5{right:-8%;bottom:10%;width:40vmin;height:40vmin}
    .bg-circle-6{left:-10%;top:55%;width:32vmin;height:32vmin}
    .bg-circle-7{left:5%;top:35%;width:28vmin;height:28vmin}
    .bg-circle-8{right:2%;top:70%;width:36vmin;height:36vmin}
    .bg-circle-9{left:-8%;bottom:5%;width:44vmin;height:44vmin}
    .bg-circle-10{right:-28%;top:40%;width:52vmin;height:52vmin}
    .bg-circle-11{left:15%;top:75%;width:30vmin;height:30vmin}
    .bg-circle-12{right:10%;bottom:30%;width:26vmin;height:26vmin}
    .bg-circle-13{left:-25%;top:14%;width:55vmin;height:55vmin}
    .bg-circle-14{left:-15%;top:22%;width:50vmin;height:50vmin}
    .bg-circle-15{left:-20%;top:18%;width:48vmin;height:48vmin}
    .bg-circle-16{right:-28%;top:28%;width:56vmin;height:56vmin}
    .bg-circle-17{right:-18%;top:34%;width:52vmin;height:52vmin}
    .bg-circle-18{right:-22%;top:30%;width:50vmin;height:50vmin}
    .bg-circle-19{left:-5%;top:5%;width:38vmin;height:38vmin}
    .bg-circle-20{left:25%;top:8%;width:32vmin;height:32vmin}
    .bg-circle-21{right:15%;top:6%;width:36vmin;height:36vmin}
    .bg-circle-22{left:40%;top:3%;width:28vmin;height:28vmin}
    .bg-circle-23{right:-8%;top:10%;width:42vmin;height:42vmin}
    .bg-circle-24{left:8%;top:12%;width:30vmin;height:30vmin}
    .site-header,#app,.site-footer{position:relative;z-index:1}
  </style>
</head>
<body>
  <div class="page-with-circles">
  <div class="bg-circles" aria-hidden="true"><div class="bg-circle bg-circle--solid bg-circle-1"></div><div class="bg-circle bg-circle--dashed bg-circle-2"></div><div class="bg-circle bg-circle--gradient bg-circle-3"></div><div class="bg-circle bg-circle--solid bg-circle-4"></div><div class="bg-circle bg-circle--gradient-dashed bg-circle-5"></div><div class="bg-circle bg-circle--solid bg-circle-6"></div><div class="bg-circle bg-circle--gradient bg-circle-7"></div><div class="bg-circle bg-circle--dashed bg-circle-8"></div><div class="bg-circle bg-circle--gradient bg-circle-9"></div><div class="bg-circle bg-circle--gradient-dashed bg-circle-10"></div><div class="bg-circle bg-circle--solid bg-circle-11"></div><div class="bg-circle bg-circle--gradient bg-circle-12"></div><div class="bg-circle bg-circle--solid bg-circle-13"></div><div class="bg-circle bg-circle--green-gradient bg-circle-14"></div><div class="bg-circle bg-circle--dotted bg-circle-15"></div><div class="bg-circle bg-circle--solid bg-circle-16"></div><div class="bg-circle bg-circle--gradient bg-circle-17"></div><div class="bg-circle bg-circle--dotted bg-circle-18"></div><div class="bg-circle bg-circle--gradient bg-circle-19"></div><div class="bg-circle bg-circle--dashed bg-circle-20"></div><div class="bg-circle bg-circle--solid bg-circle-21"></div><div class="bg-circle bg-circle--green-gradient bg-circle-22"></div><div class="bg-circle bg-circle--dotted bg-circle-23"></div><div class="bg-circle bg-circle--gradient-dashed bg-circle-24"></div></div>
  ${PAGE_LOADER}
  ${HEADER_HTML}
  <div id="app">${bodyContent}</div>
  ${FOOTER_HTML}
  </div>
  <script>${PAGE_LOADER_SCRIPT}</script>
</body>
</html>`;
}

// ----- Page generators -----
function generateHomePage(data) {
  const provinces = [...new Set(data.map((r) => r.province).filter(Boolean))].sort();
  const provinceLinks = provinces
    .map(
      (p) =>
        `<a href="/province/${toSlug(p)}/" class="town-link">${escapeHtml(p)}</a>`
    )
    .join('');

  const bodyContent = `
    <div class="welcome-section" style="background:#f1f5f9;padding:2.1rem 1.2rem;margin-bottom:0">
      <div style="max-width:56rem;margin:0 auto;padding:0 1.2rem">
        <h2 style="color:#15803d;font-size:1.25rem;font-weight:700;margin:0 0 0.9rem;line-height:1.3">Find Any South African Postal Code or Zip Code — Fast &amp; Accurate</h2>
        <p style="color:#1f2937;margin:0;line-height:1.6;font-size:1.2rem">Welcome, mypostalcode is a fast, reliable search engine designed to help you find South African postal codes and zip codes for cities, suburbs, towns, and PO Boxes across the country. Whether you're sending mail, filling out forms, running a business, or building software that needs clean address data you are exactly in the right place.</p>
      </div>
    </div>
    <div class="container" id="searchView">
      <div class="how-to-use-top">
        <button type="button" class="how-to-use-summary" aria-expanded="false" aria-controls="how-to-use-content">How to Use</button>
        <div class="how-to-use-anim" id="how-to-use-content">
          <div class="how-to-use-lines">
            1. <strong>Use Location</strong> — Click the green button to find your postal code from your current position<br>
            2. <strong>Browse</strong> — Use the province list below to explore by region<br>
            3. <strong>View Details</strong> — Click on any result to see full postal code information
          </div>
        </div>
      </div>
      <p class="text-slate-500 text-center" style="font-size:0.875rem;margin-top:0;margin-bottom:1rem">${data.length.toLocaleString()} postal codes across South Africa</p>
      <div class="card mb-8">
        <div class="search-box">
          <div class="search-input-wrap">
            <svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" id="searchInput" placeholder="Search by postal code, area, or city..." autocomplete="off" aria-label="Search postal codes">
          </div>
          <button type="button" class="btn-location" id="btnLocation" title="Use my location" aria-label="Use my location">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span class="btn-location-text">Use location</span>
          </button>
        </div>
        <p class="text-amber-600" role="alert" id="locationError" style="display:none"></p>
      </div>
      <div id="searchResultsWrap"></div>
      <h2 class="about-title" style="margin-top:2rem;margin-bottom:1rem">Browse by Province</h2>
      <div class="card">${provinceLinks}</div>
      <p class="text-slate-500" style="margin-top:1rem;font-size:0.9rem;line-height:1.5">Each province page can expand into districts, cities, suburbs, and individual postal codes.</p>
      <div class="card" style="margin-top:2rem;padding:1.5rem 1.5rem 1.75rem">
        <h2 class="about-title" style="font-size:1.5rem;margin-bottom:1rem">About Postal Codes</h2>
        <p class="about-text">South African postal codes are four-digit numerical codes used by the South African Post Office to facilitate mail delivery and identify geographic locations throughout the country.</p>
        <p class="about-text" style="margin-top:1rem">Each postal code corresponds to specific areas, suburbs, or regions within cities, making it easier for both mail carriers and residents to identify precise locations.</p>
      </div>

      <section style="margin-top:3rem;padding-top:2rem;border-top:1px solid #e2e8f0">
        <h2 class="about-title" style="font-size:1.5rem;margin-bottom:1rem;color:#15803d">Major Cities in South Africa &amp; Their Postal Code Areas</h2>
        <p class="about-text" style="margin-bottom:2rem">Explore postal codes and zip codes in South Africa's major cities and administrative capitals. These cities generate the highest search demand for queries such as "what is my postal code", "what is my zip code", "my zipcode", and "South African zip code". Each city below includes thousands of addresses, suburbs, and locations where accurate postal code information is essential.</p>

        <h3 class="about-title" style="font-size:1.25rem;margin:2rem 0 0.75rem;color:#1e293b">Johannesburg</h3>
        <p class="about-text">If you are searching for "what is my postal code in Johannesburg" or "my postal code Johannesburg", this city contains one of the most complex postal layouts in South Africa. Johannesburg is the country's largest city and its primary economic hub, made up of hundreds of suburbs, business districts, and residential zones. Because of this scale, finding the correct Johannesburg postal code depends on the exact suburb or area. People frequently search for their zip code in Johannesburg when completing online forms, deliveries, registrations, and business documents. Accurate postal code data helps ensure mail delivery, logistics, and location verification across the city. Whether you are in the inner city, northern suburbs, or surrounding areas, knowing your Johannesburg postal code is essential.</p>

        <h3 class="about-title" style="font-size:1.25rem;margin:2rem 0 0.75rem;color:#1e293b">Cape Town</h3>
        <p class="about-text">Many users search for "Cape Town zip code", "what is my postal code in Cape Town", or "my zipcode Cape Town" due to the city's wide geographic spread. Cape Town includes coastal suburbs, the city bowl, residential communities, and surrounding regions that all use different postal codes. Because suburbs are often close together, selecting the correct Cape Town postal code is important for accuracy. Postal codes in Cape Town are commonly required for tourism bookings, online shopping, property transactions, and government services. Using the correct zip code ensures that services and deliveries reach the right destination within the city.</p>

        <h3 class="about-title" style="font-size:1.25rem;margin:2rem 0 0.75rem;color:#1e293b">Durban</h3>
        <p class="about-text">Searches like "what is my postal code in Durban" or "Durban zip code" are common due to the city's large population and commercial activity. Durban is a major coastal city with residential suburbs, industrial zones, and business districts spread across the metropolitan area. Postal codes help organize this structure and support mail delivery, courier services, and logistics linked to the port. Whether you live near the beachfront, central Durban, or outer suburbs, knowing your correct Durban postal code is important for daily use and official purposes.</p>

        <h3 class="about-title" style="font-size:1.25rem;margin:2rem 0 0.75rem;color:#1e293b">Pretoria</h3>
        <p class="about-text">People frequently look up "what is my postal code in Pretoria" or "Pretoria zip code" when dealing with government offices, institutions, and official correspondence. Pretoria is South Africa's administrative capital and contains structured residential areas and government precincts. Postal codes are widely used for documentation, registrations, and public services. As part of the Gauteng region, Pretoria's postal system supports both local residents and national administration. Finding the correct Pretoria postal code ensures accuracy in official and private communication.</p>

        <h3 class="about-title" style="font-size:1.25rem;margin:2rem 0 0.75rem;color:#1e293b">Bloemfontein</h3>
        <p class="about-text">If you are searching for "my postal code in Bloemfontein" or "Bloemfontein zip code", this city serves as the judicial capital of South Africa and a central hub in the Free State. Bloemfontein includes residential suburbs, legal institutions, and commercial areas that rely on accurate postal code information. Postal codes are important for court correspondence, businesses, and everyday deliveries. Knowing your Bloemfontein postal code helps ensure reliable service across the city.</p>

        <h3 class="about-title" style="font-size:1.25rem;margin:2rem 0 0.75rem;color:#1e293b">Polokwane</h3>
        <p class="about-text">Searches such as "what is my postal code in Polokwane" or "Polokwane zip code" are increasingly common as the city grows. Polokwane is the capital of Limpopo and a major regional center for administration, retail, and education. With expanding suburbs and new developments, postal codes help manage growth and service delivery. Finding the correct Polokwane postal code is important for residents, businesses, and government services operating in the area.</p>

        <h3 class="about-title" style="font-size:1.25rem;margin:2rem 0 0.75rem;color:#1e293b">Nelspruit (Mbombela)</h3>
        <p class="about-text">Users often search for "Nelspruit zip code" or "what is my postal code in Mbombela" when dealing with tourism, business, or residential addresses. Nelspruit is the capital of Mpumalanga and a gateway to major tourist destinations. Postal codes support both urban areas and surrounding communities. Accurate postal code information helps ensure smooth logistics, bookings, and service delivery in the region.</p>

        <h3 class="about-title" style="font-size:1.25rem;margin:2rem 0 0.75rem;color:#1e293b">Pietermaritzburg</h3>
        <p class="about-text">Search queries like "what is my postal code in Pietermaritzburg" or "Pietermaritzburg zip code" reflect the city's role as the capital of KwaZulu-Natal. The city contains government offices, educational institutions, and established suburbs. Postal codes are essential for official correspondence, student services, and business operations. Knowing your Pietermaritzburg postal code helps avoid delays and errors in communication.</p>

        <h3 class="about-title" style="font-size:1.25rem;margin:2rem 0 0.75rem;color:#1e293b">Kimberley</h3>
        <p class="about-text">People searching for "Kimberley zip code" or "what is my postal code in Kimberley" often need accurate information due to the city's role as the capital of the Northern Cape. Kimberley serves as an administrative and economic hub in a province with vast distances between towns. Postal codes help organize residential areas, businesses, and government services. Accurate postal code data is especially important in a region with wide geographic coverage.</p>

        <h3 class="about-title" style="font-size:1.25rem;margin:2rem 0 0.75rem;color:#1e293b">Mahikeng</h3>
        <p class="about-text">Searches such as "Mahikeng postal code" or "my zip code in Mafikeng" are common for provincial administration and local services. Mahikeng is the capital of the North West province and includes residential suburbs and government facilities. Postal codes support communication and service delivery for both urban and surrounding rural areas. Knowing the correct Mahikeng postal code ensures efficient handling of mail and services.</p>

        <h3 class="about-title" style="font-size:1.25rem;margin:2rem 0 0.75rem;color:#1e293b">Bhisho (Bisho)</h3>
        <p class="about-text">Users looking for "Bhisho postal code" or "what is my zip code in Bisho" typically need accurate information for government and administrative purposes. Bhisho is the capital of the Eastern Cape and functions mainly as an administrative city. Postal codes are essential for official correspondence, infrastructure planning, and service delivery. Correct postal code usage supports efficient provincial operations.</p>

        <p class="text-slate-500" style="margin-top:2rem;font-size:0.85rem;font-style:italic">Image grid suggestion: one high-quality, consistent image per city — skyline, landmark, or aerial view.</p>

        <h2 class="about-title" style="font-size:1.5rem;margin:3rem 0 1rem;color:#15803d">Why Use MyPostalCodes.co.za for South African Postal Codes?</h2>
        <ul style="margin:0;padding-left:1.5rem;line-height:2;color:#334155;list-style:none">
          <li style="position:relative;padding-left:1.5rem">✔ Accurate South African postal code and zip code data</li>
          <li style="position:relative;padding-left:1.5rem">✔ Fast search for cities, suburbs, and towns</li>
          <li style="position:relative;padding-left:1.5rem">✔ Browse postal codes by province or major city</li>
          <li style="position:relative;padding-left:1.5rem">✔ Useful for individuals, businesses, and developers</li>
          <li style="position:relative;padding-left:1.5rem">✔ Built specifically for South Africa</li>
        </ul>
        <p class="about-text" style="margin-top:1.5rem">Future features may include GPS-based lookup, suburb-level maps, API access, and downloadable datasets.</p>

        <h2 class="about-title" style="font-size:1.5rem;margin:3rem 0 1rem;color:#15803d">Frequently Asked Questions About South African Postal Codes</h2>

        <div style="margin-bottom:1.5rem">
          <h4 style="font-size:1.1rem;font-weight:600;margin:0 0 0.5rem;color:#1e293b">What is my postal code?</h4>
          <p class="about-text" style="margin:0">Your postal code is a four-digit number used to identify the area where you live or receive mail in South Africa. If you are asking "what is my postal code", the exact code depends on your suburb, town, or city. You can find it by searching your location on MyPostalCodes.co.za.</p>
        </div>
        <div style="margin-bottom:1.5rem">
          <h4 style="font-size:1.1rem;font-weight:600;margin:0 0 0.5rem;color:#1e293b">How do I find my zip code in South Africa?</h4>
          <p class="about-text" style="margin:0">Many people search for "what is my zip code" or "my zipcode", but in South Africa, zip codes are called postal codes. To find your South African zip code, simply search for your suburb or city, and the correct postal code will be shown.</p>
        </div>
        <div style="margin-bottom:1.5rem">
          <h4 style="font-size:1.1rem;font-weight:600;margin:0 0 0.5rem;color:#1e293b">Are postal codes and zip codes the same in South Africa?</h4>
          <p class="about-text" style="margin:0">Yes. While the term zip code is commonly used internationally, South Africa officially uses postal codes. When someone searches for a South African zip code, they are referring to a postal code.</p>
        </div>
        <div style="margin-bottom:1.5rem">
          <h4 style="font-size:1.1rem;font-weight:600;margin:0 0 0.5rem;color:#1e293b">What is my postal code in Johannesburg?</h4>
          <p class="about-text" style="margin:0">If you are searching for "what is my postal code in Johannesburg", the correct postal code depends on the specific suburb or area within the city. Johannesburg has many different postal code zones, so it's important to search by suburb for accurate results.</p>
        </div>
        <div style="margin-bottom:1.5rem">
          <h4 style="font-size:1.1rem;font-weight:600;margin:0 0 0.5rem;color:#1e293b">What is the Cape Town zip code?</h4>
          <p class="about-text" style="margin:0">There is no single Cape Town zip code. Cape Town has multiple postal codes assigned to different suburbs and districts. If you are looking for the Cape Town zip code, search for your exact area to find the correct postal code.</p>
        </div>
        <div style="margin-bottom:0">
          <h4 style="font-size:1.1rem;font-weight:600;margin:0 0 0.5rem;color:#1e293b">Why do different suburbs have different postal codes?</h4>
          <p class="about-text" style="margin:0">Postal codes are assigned to help organize mail delivery and services efficiently. Different suburbs, towns, and PO Box areas require separate postal codes to ensure accurate routing and delivery.</p>
        </div>
      </section>
    </div>
  `;

  return layout({
    title: 'South African Postal Code Search | Find Zip Codes',
    description:
      'Search and browse South African postal codes by province, town, and area. Find accurate zip code information for all regions in South Africa.',
    canonical: '/',
    bodyContent,
  });
}

function generateProvincePage(province, towns, data) {
  const provinceSlug = toSlug(province);
  const townSlugs = buildTownSlugMap(data);

  const townLinks = towns
    .map((town) => {
      const slug = townSlugs.get(town.key) || toSlug(town.name);
      return `<a href="/town/${slug}/" class="town-link">${escapeHtml(town.name)} <span style="color:#94a3b8;font-weight:400">(${town.count} areas)</span></a>`;
    })
    .join('');

  const bodyContent = `
    <div class="container">
      <a href="/" class="btn-back">&#8592; Back to search</a>
      <p class="breadcrumb"><a href="/">Home</a> &rarr; ${escapeHtml(province)}</p>
      <h1 class="title" style="margin-bottom:0.5rem">${escapeHtml(province)}</h1>
      <p class="subtitle">Postal codes and towns in ${escapeHtml(province)}</p>
      <div class="card">${townLinks}</div>
    </div>
  `;

  return layout({
    title: `Postal Codes in ${province} | South Africa`,
    description: `Find postal codes for towns and areas in ${province}, South Africa. Browse ${towns.length} towns.`,
    canonical: `/province/${provinceSlug}/`,
    bodyContent,
  });
}

function generateTownPage(province, town, areas, townSlug, data) {
  const provinceSlug = toSlug(province);

  const areaLinks = areas
    .map((a) => {
      const areaSlug = toSlug(a.area);
      const href = `/town/${townSlug}/${areaSlug}/`;
      return `<a href="${href}" class="area-link"><span class="result-area">${escapeHtml(a.area)}</span><span class="result-code" style="float:right">${escapeHtml(a.postal_code)}</span></a>`;
    })
    .join('');

  const bodyContent = `
    <div class="container">
      <a href="/" class="btn-back">&#8592; Back to search</a>
      <p class="breadcrumb"><a href="/">Home</a> &rarr; <a href="/province/${provinceSlug}/">${escapeHtml(province)}</a> &rarr; ${escapeHtml(town)}</p>
      <h1 class="title" style="margin-bottom:0.5rem">${escapeHtml(town)}</h1>
      <p class="subtitle">${escapeHtml(province)} · ${areas.length} postal code areas</p>
      <div class="card">${areaLinks}</div>
    </div>
  `;

  return layout({
    title: `Postal Codes in ${town}, ${province} | South Africa`,
    description: `Find postal codes for ${town}, ${province}. ${areas.length} areas including ${areas.slice(0, 3).map((a) => a.area).join(', ')}${areas.length > 3 ? '...' : ''}.`,
    canonical: `/town/${townSlug}/`,
    bodyContent,
  });
}

function generateAreaPage(entry, others, townSlug) {
  const areaSlug = toSlug(entry.area);
  const displayName = (entry.area || '').trim() || 'Area';
  const cityDisplay = (entry.city || '').trim();
  const provinceDisplay = (entry.province || '').trim();
  const code = (entry.postal_code || '').trim();
  const provinceSlug = toSlug(entry.province);

  const othersAreas = others
    .map((d) => (d.area || '').trim())
    .filter(Boolean);
  const areaSameAsCity =
    displayName.toLowerCase() === cityDisplay.toLowerCase();
  const firstLine = areaSameAsCity
    ? `The postal code for <strong>${escapeHtml(displayName)}</strong> is <strong>${escapeHtml(code)}</strong>, ${escapeHtml(displayName)} is a town in <strong>${escapeHtml(provinceDisplay)}</strong>.`
    : `The postal code for <strong>${escapeHtml(displayName)}</strong> is <strong>${escapeHtml(code)}</strong>, ${escapeHtml(displayName)} is an area near <strong>${escapeHtml(cityDisplay)}</strong>.`;
  const restOfText =
    othersAreas.length === 0
      ? `This postal code is used for mail delivery and address verification across ${escapeHtml(displayName)} in <strong>${escapeHtml(provinceDisplay)}</strong>. Use it when sending mail, filling out forms, or completing online registrations to ensure accurate delivery.`
      : `This postal code also serves: ${othersAreas.map((a) => escapeHtml(a)).join(', ')}. When addressing mail or completing address forms, use the correct area or suburb name to ensure accurate delivery.`;
  const aboutText = `${firstLine} ${restOfText}`;

  const aliasList = (entry.aliases || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((a) => a.toLowerCase() !== 'xx');
  const aliasesHtml =
    aliasList.length > 0
      ? `<div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid #e2e8f0">
          <h2 class="about-title">Also known as</h2>
          <div class="alias-chips">${aliasList.map((a) => `<span class="alias-chip">${escapeHtml(a)}</span>`).join('')}</div>
        </div>`
      : '';

  const svgPin =
    '<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  const svgBuilding =
    '<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01"/></svg>';
  const svgMap =
    '<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2"><path d="M8 2v20M16 2v20M2 8h4M2 16h4M18 8h4M18 16h4M2 12h20"/></svg>';

  const bodyContent = `
    <div class="container">
      <a href="/" class="btn-back">&#8592; Back to search</a>
      <p class="breadcrumb"><a href="/">Home</a> &rarr; <a href="/province/${provinceSlug}/">${escapeHtml(provinceDisplay)}</a> &rarr; <a href="/town/${townSlug}/">${escapeHtml(cityDisplay)}</a> &rarr; ${escapeHtml(displayName)}</p>
      <div class="card" style="overflow:hidden">
        <div class="detail-header">
          <h1>${escapeHtml(code)}</h1>
          <p>South African Postal Code · ${escapeHtml(displayName)}</p>
        </div>
        <div class="detail-body">
          <div class="detail-grid">
            <div class="detail-item"><div>${svgPin}</div><div><div class="detail-label">Area</div><div class="detail-value">${escapeHtml(displayName)}</div></div></div>
            <div class="detail-item"><div>${svgBuilding}</div><div><div class="detail-label">City</div><div class="detail-value"><a href="/town/${townSlug}/" class="detail-link">${escapeHtml(cityDisplay)}</a></div></div></div>
            <div class="detail-item"><div>${svgMap}</div><div><div class="detail-label">Province</div><div class="detail-value"><a href="/province/${provinceSlug}/" class="detail-link">${escapeHtml(provinceDisplay)}</a></div></div></div>
          </div>
          ${aliasesHtml}
          <div style="margin-top:2rem;padding-top:2rem;border-top:1px solid #e2e8f0">
            <h2 class="about-title">About This Postal Code</h2>
            <p class="about-text">${aboutText}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  return layout({
    title: `Postal Code ${code} - ${displayName}, ${cityDisplay} | South Africa`,
    description: `Postal code ${code} for ${displayName}, ${cityDisplay}, ${provinceDisplay}. Find address and delivery information.`,
    canonical: `/town/${townSlug}/${areaSlug}/`,
    bodyContent,
  });
}

// ----- Town slug disambiguation -----
function buildTownSlugMap(data) {
  const byTown = new Map(); // townKey -> Set(province)
  data.forEach((r) => {
    const city = (r.city || '').trim();
    const province = (r.province || '').trim();
    if (!city) return;
    const key = city.toLowerCase();
    if (!byTown.has(key)) byTown.set(key, new Set());
    byTown.get(key).add(province.toLowerCase());
  });

  const townSlugs = new Map(); // "province|town" -> slug
  data.forEach((r) => {
    const city = (r.city || '').trim();
    const province = (r.province || '').trim();
    if (!city) return;
    const key = `${province}|${city}`;
    if (townSlugs.has(key)) return;
    const baseSlug = toSlug(city);
    const provinces = byTown.get(city.toLowerCase());
    const needsProvince = provinces && provinces.size > 1;
    const slug = needsProvince ? `${toSlug(province)}-${baseSlug}` : baseSlug;
    townSlugs.set(key, slug);
  });

  return townSlugs;
}

function getTownSlugForEntry(entry, townSlugMap) {
  const city = (entry.city || '').trim();
  const province = (entry.province || '').trim();
  const key = `${province}|${city}`;
  return townSlugMap.get(key) || toSlug(city);
}

// ----- Main -----
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Loading postal codes...');
let data;
try {
  data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
} catch (e) {
  console.error('Run "npm run db:json" first to generate postal-codes.json');
  process.exit(1);
}

if (!Array.isArray(data) || data.length === 0) {
  console.error('No postal code data found.');
  process.exit(1);
}

// Preview mode: filter to one province only (faster dev builds)
if (PREVIEW_PROVINCE) {
  const matchSlug = toSlug(PREVIEW_PROVINCE);
  data = data.filter((r) => toSlug(r.province) === matchSlug);
  const provinceName = data[0]?.province || PREVIEW_PROVINCE;
  console.log('PREVIEW MODE: Only', provinceName, '(' + data.length + ' postal codes)');
  if (data.length === 0) {
    console.error('No data for province:', PREVIEW_PROVINCE);
    process.exit(1);
  }
}

// Clean dist
if (fs.existsSync(DIST_PATH)) {
  fs.rmSync(DIST_PATH, { recursive: true });
}
ensureDir(DIST_PATH);

const townSlugMap = buildTownSlugMap(data);

// Index (home)
writeFile(path.join(DIST_PATH, 'index.html'), generateHomePage(data));
console.log('  / (home)');

// Province pages
const byProvince = new Map();
data.forEach((r) => {
  const p = (r.province || '').trim();
  if (!p) return;
  if (!byProvince.has(p)) byProvince.set(p, new Map());
  const town = (r.city || '').trim();
  if (!town) return;
  const townData = byProvince.get(p).get(town) || { name: town, areas: [], key: `${p}|${town}` };
  townData.areas.push(r);
  byProvince.get(p).set(town, townData);
});

for (const [province, townsMap] of byProvince) {
  const towns = Array.from(townsMap.values())
    .map((t) => ({ ...t, count: t.areas.length }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const provinceDir = path.join(DIST_PATH, 'province', toSlug(province));
  ensureDir(provinceDir);
  writeFile(
    path.join(provinceDir, 'index.html'),
    generateProvincePage(province, towns, data)
  );
  console.log('  /province/' + toSlug(province) + '/');
}

// Town and Area pages
for (const [province, townsMap] of byProvince) {
  for (const [townName, townData] of townsMap) {
    const townSlug = getTownSlugForEntry(townData.areas[0], townSlugMap);
    const townDir = path.join(DIST_PATH, 'town', townSlug);
    ensureDir(townDir);

    writeFile(
      path.join(townDir, 'index.html'),
      generateTownPage(province, townName, townData.areas, townSlug, data)
    );
    console.log('  /town/' + townSlug + '/');

    for (const entry of townData.areas) {
      const areaSlug = toSlug(entry.area);
      const others = data.filter(
        (r) =>
          r.postal_code === entry.postal_code &&
          r.city === entry.city &&
          r.area !== entry.area
      );
      const areaDir = path.join(townDir, areaSlug);
      ensureDir(areaDir);
      writeFile(
        path.join(areaDir, 'index.html'),
        generateAreaPage(entry, others, townSlug)
      );
    }
  }
}

// Copy public assets (icon.png, etc.) to dist
const publicDir = path.join(ROOT, 'public');
const iconSrc = path.join(publicDir, 'icon.png');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(DIST_PATH, 'icon.png'));
  console.log('  icon.png');
}

// Copy postal-codes.json for client-side search (filtered in preview mode)
fs.writeFileSync(
  path.join(DIST_PATH, 'postal-codes.json'),
  JSON.stringify(data),
  'utf8'
);

// Build slug map for client-side search (matches server-generated URLs)
const slugMap = {};
for (const [province, townsMap] of byProvince) {
  for (const [townName] of townsMap) {
    const key = `${province}|${townName}`;
    slugMap[key.toLowerCase()] = getTownSlugForEntry({ city: townName, province }, townSlugMap);
  }
}
const slugMapJson = JSON.stringify(slugMap);

// Add client-side search script to home page (uses slug map for correct URLs)
const homePath = path.join(DIST_PATH, 'index.html');
let homeHtml = fs.readFileSync(homePath, 'utf8');
const searchScript = `
  <script>
  (function(){
    var DATA_SRC = '/postal-codes.json';
    var SLUG_MAP = ${slugMapJson};
    let DATA = [];
    function getTownSlug(city, province){
      var key = (province+'|'+city).toLowerCase();
      return SLUG_MAP[key] || (city||'').trim().toLowerCase().replace(/\\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'')||'area';
    }
    function escapeHtml(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function toSlug(s){ if(!s) return ''; return String(s).trim().toLowerCase().replace(/\\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'')||'area'; }
    function searchFilter(q){
      var query = (q||'').trim().toLowerCase();
      if(!query) return [];
      var seen = {};
      var results = [];
      DATA.forEach(function(r){
        var match = (r.area||'').toLowerCase().includes(query) || (r.city||'').toLowerCase().includes(query) ||
          (r.province||'').toLowerCase().includes(query) || (r.postal_code||'').includes(query) ||
          (r.aliases||'').split('|').some(function(a){ return a.toLowerCase().includes(query); });
        if(match && !seen[r.id]){
          seen[r.id]=1;
          var townSlug = getTownSlug(r.city, r.province);
          var areaSlug = toSlug(r.area);
          results.push({...r, href:'/town/'+townSlug+'/'+areaSlug+'/'});
        }
      });
      return results.slice(0,20);
    }
    function findBestLocationMatch(addr){
      var postcode = String(addr.postcode||'').trim();
      var suburb = String(addr.suburb||addr.neighbourhood||addr.quarter||'').trim();
      var village = String(addr.village||addr.town||'').trim();
      var city = String(addr.city||addr.municipality||addr.county||'').trim();
      var state = String(addr.state||'').trim();
      if(city&&city.indexOf(' of ')>0) city = city.replace(/^(City|District|Metropolitan Municipality) of /i,'').trim();
      var terms = [postcode, suburb, village, city, state].filter(Boolean);
      var combined = [suburb+' '+city, suburb+village, village+city].map(function(s){ return s.trim(); }).filter(function(s){ return s.length>2; });
      terms = terms.concat(combined);
      var seen = {};
      var best = null, bestScore = 0;
      for(var i=0;i<terms.length;i++){
        var q = terms[i].toLowerCase();
        if(!q||q.length<2||seen[q]) continue;
        seen[q]=1;
        var matches = searchFilter(terms[i]);
        for(var j=0;j<matches.length;j++){
          var r = matches[j], s = 0;
          if(postcode && r.postal_code===postcode) s = 100;
          else if((r.area||'').toLowerCase().includes(q)||(r.aliases||'').toLowerCase().includes(q)) s = 85;
          else if((r.city||'').toLowerCase().includes(q)) s = 70;
          else if((r.province||'').toLowerCase().includes(q)) s = 50;
          if(s>bestScore){ bestScore=s; best=r; }
        }
        if(bestScore>=100) break;
      }
      return best;
    }
    function renderResults(query){
      var wrap = document.getElementById('searchResultsWrap');
      if(!wrap) return;
      var results = searchFilter(query);
      if(results.length===0){
        wrap.innerHTML = query ? '<div class="text-center py-12"><p class="text-slate-500">No results for \"'+escapeHtml(query)+'\"</p></div>' : '';
        return;
      }
      wrap.innerHTML = '<div class="card">' + results.map(function(r){
        var townSlug = getTownSlug(r.city, r.province);
        var provSlug = toSlug(r.province);
        var cityPart = r.city ? '<a href="/town/'+townSlug+'/" class="result-meta-link">'+escapeHtml(r.city)+'</a>' : '';
        var provPart = r.province ? '<a href="/province/'+provSlug+'/" class="result-meta-link">'+escapeHtml(r.province)+'</a>' : '';
        var meta = cityPart + (cityPart&&provPart ? ', ' : '') + provPart;
        return '<a href="'+r.href+'" class="result-row" style="display:block;text-decoration:none;color:inherit;"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="result-area">'+escapeHtml(r.area)+'</div><p class="result-meta">'+meta+'</p></div><div class="result-code">'+escapeHtml(r.postal_code)+'</div></div></a>';
      }).join('') + '</div>';
    }
    fetch(DATA_SRC).then(function(res){ return res.json(); }).then(function(d){ DATA=d; });
    var inp = document.getElementById('searchInput');
    var locBtn = document.getElementById('btnLocation');
    var errEl = document.getElementById('locationError');
    if(inp) inp.addEventListener('input', function(){ renderResults(this.value); });
    if(locBtn){
      locBtn.addEventListener('click', function(){
        if(!navigator.geolocation){ errEl.textContent='Geolocation not supported'; errEl.style.display='block'; return; }
        locBtn.disabled = true;
        navigator.geolocation.getCurrentPosition(
          function(pos){
            var lat=pos.coords.latitude, lon=pos.coords.longitude;
            var nomFetch = fetch('https://nominatim.openstreetmap.org/reverse?lat='+lat+'&lon='+lon+'&format=json&addressdetails=1', { headers: { 'User-Agent': 'MyZipCode-co-za/1.0', 'Accept-Language': 'en' } }).then(function(r){ return r.json(); });
            var photonFetch = fetch('https://photon.komoot.io/reverse?lat='+lat+'&lon='+lon).then(function(r){ return r.json(); }).catch(function(){ return null; });
            Promise.all([nomFetch, photonFetch]).then(function(arr){
              locBtn.disabled = false;
              var data = arr[0], photon = arr[1];
              var addr = data&&data.address||{};
              if(data&&data.country_code&&data.country_code!=='za'){ errEl.textContent='Location is not in South Africa.'; errEl.style.display='block'; return; }
              if(photon&&photon.features&&photon.features[0]){
                var p = photon.features[0].properties||{};
                if(p.countrycode!=='ZA'){ errEl.textContent='Location is not in South Africa.'; errEl.style.display='block'; return; }
                if(p.postcode) addr.postcode = p.postcode;
                if(p.locality) addr.suburb = p.locality;
                if(!addr.city&&p.city) addr.city = p.city;
                if(!addr.state&&p.state) addr.state = p.state;
                if(!addr.municipality&&p.county) addr.municipality = p.county;
              }
              var best = findBestLocationMatch(addr);
              if(best){ window.location.href = best.href; return; }
              var q = String(addr.postcode||addr.suburb||addr.neighbourhood||addr.city||addr.town||addr.village||addr.municipality||addr.state||'').trim();
              if(q){ var r = searchFilter(q); if(r.length){ window.location.href = r[0].href; return; } }
              errEl.textContent='No South African postal code found for this location.';
              errEl.style.display='block';
            }).catch(function(){ locBtn.disabled=false; errEl.textContent='Lookup failed.'; errEl.style.display='block'; });
          },
          function(err){ locBtn.disabled=false; errEl.textContent=err.code===1?'Location denied.':'Location unavailable.'; errEl.style.display='block'; },
          { enableHighAccuracy:true, timeout:10000 }
        );
      });
    }
    document.querySelector('.how-to-use-summary')?.addEventListener('click', function(){
      var box = this.closest('.how-to-use-top');
      if(box){ box.classList.toggle('open'); this.setAttribute('aria-expanded', box.classList.contains('open')); }
    });
  })();
  </script>
`;

homeHtml = homeHtml.replace('</body>', searchScript + '\n</body>');
fs.writeFileSync(homePath, homeHtml);

// Generate sitemap.xml and robots.txt for SEO
const sitemapUrls = ['/', ...Array.from(byProvince.keys()).map((p) => `/province/${toSlug(p)}/`)];
for (const [, townsMap] of byProvince) {
  for (const [, townData] of townsMap) {
    const townSlug = getTownSlugForEntry(townData.areas[0], townSlugMap);
    sitemapUrls.push(`/town/${townSlug}/`);
    for (const entry of townData.areas) {
      sitemapUrls.push(`/town/${townSlug}/${toSlug(entry.area)}/`);
    }
  }
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((u) => `  <url><loc>${BASE_URL}${u}</loc><changefreq>monthly</changefreq><priority>${u === '/' ? '1.0' : u.split('/').length <= 3 ? '0.8' : '0.6'}</priority></url>`).join('\n')}
</urlset>`;
writeFile(path.join(DIST_PATH, 'sitemap.xml'), sitemap);
writeFile(
  path.join(DIST_PATH, 'robots.txt'),
  `User-agent: *
Allow: /
Sitemap: ${BASE_URL}/sitemap.xml
`
);
console.log('  sitemap.xml, robots.txt');

console.log('\nGenerated static site in dist/');
console.log('  - Home: /');
console.log('  - Province pages: /province/{slug}/');
console.log('  - Town pages: /town/{town}/');
console.log('  - Area pages: /town/{town}/{area}/');
console.log('  - sitemap.xml for search engines');
console.log('\nRun "npm run preview" or deploy dist/ to any static host.');
