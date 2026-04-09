const quotesData = [
  { "name": "โอนาท่านหนึ่ง", "quote": "Ohna still here นะคะ อยู่กับเด็กๆไปนานๆน้าาา" },
  { "name": "WMine96", "quote": "ขอให้น้องคลื่นโด่งดังไปทั่วโลก" },
  { "name": "TaiiaT_2211", "quote": "คิดถึงอีกแล้ว" },
  { "name": "ทีมเฮียดรณ์รักน้องคลื่น", "quote": "ครบรอบ 1 ปีแล้ว เด็กๆเก่งกันมาก ของให้เติบโตอย่างแข็งแกร่ง ปังๆ งานเยอะๆนะคะ 🌊\n\nทีมเฮียดรณ์ 🐉🩵💛" },
  { "name": "RaBBiT_MiLkY", "quote": "ขอให้น้องคลื่นมีงานเยอะๆ ประสบความสำเร็จทุกคนเลยคับ" },
  { "name": "Wenwen0609", "quote": "Wish NexT1DE always HAPPY" },
  { "name": "IAmMe", "quote": "ขอบคุณที่จัดงานเพื่อน้องคลื่นนะคะ" },
  { "name": "lalalinnnkk", "quote": "ขอให้NT1ถูกค้นพบเยอะๆ🌊🫶" },
  { "name": "Omttar🦖", "quote": "Wish NexT1DE go higher 🌊" },
  { "name": "bbchouc16", "quote": "🌊🦖" },
  { "name": "WaN 🧸", "quote": "🌊 Happy Anniversary 🥳" },
  { "name": "zhouaom", "quote": "ขอให้ NexT1DE และ Ohna ทุกคนมีความสุข" },
  { "name": "support 🩵 HIA DORN & NexT1DE", "quote": "ขอให้ NexT1DE มีคนรัก&เอ็นดู เฮงๆ ปังๆ นะคะ ขอให้โอนาสุขภาพแข็งแรง อยู่ซัพพอร์ตด้วยกันไปนานๆน้า❤️" },
  { "name": "ชานมน้องหมี", "quote": "หม่าม๊าหัวใจน้องคลื่น 💖" },
  { "name": "Bunnie", "quote": "ความสุขของพี่🫶🏻" },
  { "name": "Jin_Tawan", "quote": "อยู่เป็นความสุขให้กันและกันไปนานๆนะเด็กๆ ขอให้ทุกคนได้เติบโตในเส้นทางนี้ตามที่ตั้งใจคับ💙🌊" },
  { "name": "Thima_c", "quote": "เติบโตไปด้วยกันน๊าาา" },
  { "name": "ssirinya", "quote": "NT1🩷" },
  { "name": "bbchouc16", "quote": "Reackless!🌊" },
  { "name": "CPCUNG", "quote": "น้องคลื่นเก่งมากกกก" },
  { "name": "แม่น้องฉง06", "quote": "น้องคลื่นเก่งมากกก^^" },
  { "name": "ppreawara", "quote": "โปรดกลับมาโชว์เพลงใหม่ที่ประเทศของฉัน" },
  { "name": "Sunshine🩷", "quote": "หมวยสวยมาดด \nฉงเกอผมฟ้าเท่สุดๆ เลย" },
  { "name": "chiki", "quote": "น้องคลื่นปังๆ" },
  { "name": "Jy-O", "quote": "Happy Anniversary! Always support and Love NT1 🩵" },
  { "name": "@shinobuhime", "quote": "Luv & appreciate things we have been doing for each other so much! 😘🌊💙💚🩷" },
  { "name": "แม่หนูจี๊ด", "quote": "น้องคลื่นสู้ๆ เจอกันที่ไทยน้า ครบรอบ1ปี" },
  { "name": "Abaek1012", "quote": "เมื่อไรจะมาไทยคิดถึงแล้ว" },
  { "name": "BB ~ 🧸", "quote": "รักน้องฉง น้องคลื่น ไว้มีโอกาสได้พบกันอีกนะคะ 🥰 ขอให้มีstageปังๆอีกเยอะๆ ให้พวกเราได้ติดตามนานๆค่ะ" },
  { "name": "ChiniizyGN", "quote": "น้องคลื่น 1 ขวบแล้ว ขอให้ยิ่งปัง ยิ่งดังทั่วเอเชียเลย (อย่าโตเร็วเกินแม่ทำใจไม่ไหว😉)" },
  { "name": "มัมหมีน้องไทโอที่ได้ไซน์🌻", "quote": "May your talent reach more and more people around the world 🌊" },
  { "name": "Sunshine🩷", "quote": "รักก้อนคลื่นมาดๆ รักก้อนคลื่น 7 ก้อนน🩵🤍" },
  { "name": "Wordsmithsix🧸🦋", "quote": "ได้ไซน์แล้วครับ เจ้าแม่บ้านโปรเจกต์ศักดิ์สิทธิ์มาก 😭🙏🤍" },
  { "name": "aliceixiong", "quote": "ลุคใหม่หมี(แพนด้า)🐼" },
  { "name": "yimku60", "quote": "เป็นกำลังใจให้น้องคลื่นนะคะ ขอให้เติบโตไปด้วยกันและเป็นที่รู้จักมากขึ้นเรื่อยๆ นะคะ ปังปังนะคะ 🌊🫶✌" },
  { "name": "Anna", "quote": "เพลงใหม่แซ่บมากกก ต้มแซ่บแบบเริ่ด \n\n🐶🧸" },
  { "name": "ShionTamizuki", "quote": "Always luv u guys naa✨🌊" },
  { "name": "babu🦖🏀", "quote": "น้องคลื่นจะ 1 ขวบแล้ว ไปกันต่อ!" },
  { "name": "ไอจี๊ดตัวแสบ🦄", "quote": "โอนามาซัพพอร์ตไอคลื่นกันเยอะๆนะคะ✨️" },
  { "name": "หม่ามี้ของหมีฉงรักน้องคลื่น 🩷🌊", "quote": "ขอให้น้องคลื่นกลับมาหา Ohna ที่ไทยไวๆนะคะ🩷" },
  { "name": "SomeoneSomewhere", "quote": "กินอิ่ม นอนหลับ มีความสุข มีพลังในการใช้ชีวิตนะลูกนะ ภูมิใจในตัวลูกๆเสมอจ้าาาา เจ้าก้อนนนน" },
  { "name": "Namaiki_girl", "quote": "ปีที่ผ่านมาเป็นปีแห่งการเรียนรู้กับเรื่องอะไรใหม่ๆ ปีหน้าลุยเลยนะครับ ลูกคลื่น ♥️" },
  { "name": "ส้มอุนหม่ามี้น้องโอมาร์", "quote": "Love NexT1DE ที่สุด" },
  { "name": "ออแอนอแอน", "quote": "เดินทางมาด้วยกันจะครบ 1 ปีแล้ว ขอให้ NT1 ประสบความสำเร็จ ได้ไปออนสเตจเยอะๆแบบที่ตั้งใจเล้ยย 🩵" },
  { "name": "H’🧸", "quote": "พรุ่งนี้ขอได้ไซน์ ขอให้ได้ไซน์ ขอให้ได้ไซน์ ไม่งั้นไม่เริ่ด 🍀" },
  { "name": "ผู้ปกครองเหมียวดรณ์ตุวจิ๋ววว😽", "quote": "ไอเยิฟฟฟฟน้องคลื่น ขอให้เด็กๆมีความสุขในทุกๆวันน้าา\n🫶🏻🌊" },
  { "name": "chodanon", "quote": "พรุ่งนี้ขอให้ได้ไซน์ ถ้าได้ไซน์จะโดอีก 100บาท 🫰🏻" },
  { "name": "Phoenixvsdrago1", "quote": "ขอให้เติบโตอย่างแข็งแกร่ง ปังๆ งานไหลมาเทมา มีคนรักเยอะๆ นะเด็กๆ\n🩵🌊" },
  { "name": "TaiiaT_2211", "quote": "ใกล้ได้เจอกันแล้วน๊าาาา นับถอยหลังแล้ว 🩵" },
  { "name": "BokBear🧸🎀🍼", "quote": "นบโปะหม่ำ ๆ นุ้งหมีกู๊ดบอย 🧸🍼" },
  { "name": "wordsmithsix🧸🦋", "quote": "ขอให้น้องคลื่นถูกค้นพบยิ่งกว่านี้🤍" },
  { "name": "bkph8", "quote": "fighting ka!" },
  { "name": "support🩵HiaDORN&NexT1DE", "quote": "ขอให้น้องคลื่นสุขภาพแข็งแรง มีความสุข+ยิ้มได้ทุกๆวัน ได้ทำโชว์เจ๋งๆ มีคนรัก+เอ็นดูพวกหนูเยอะๆ น้าา❤️" },
  { "name": "DornTheRabbit", "quote": "ดีใจที่อยู่ด้วยกันจนถึงวันนี้ แล้วมาฉลองปีหน้ากันอีกนะ🥰" },
  { "name": "ต้าวคลื่นจิ๋ว", "quote": "ขอให้น้องคลื่นและโอนาเริ่ดๆปังๆแบบนี้ไปนานๆค่าาา" },
  { "name": "นางมารร้าย", "quote": "รักทุกคนน้า" },
  { "name": "โอนาท่านหนึ่ง", "quote": "รักน้องคลื่นน้าา อยู่ด้วยกันไปนานๆเลยย🍏🌊" },
  { "name": "นางมารร้าย", "quote": "ขอให้เป็นน้องคลืนที่สดใส" },
  { "name": "Pondadys", "quote": "รักจ้า" },
  { "name": "หมีน้อยน่ารัก❤️🦦🐻🧸", "quote": "คิดถึง NexT1DE" },
  { "name": "หมีน้อยน่ารัก❤️🦦🐻🧸", "quote": "รักน้องคลื่น" },
  { "name": "รักน้องคลื่น", "quote": "น้องคลื่นน่ารัก โอนาก็น่ารัก รักนะจุ๊บๆ" }
];

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('bottles-wrapper');
    const bubbleContainer = document.getElementById('bubble-container');

    // Create background bubbles
    function createBubbles() {
        for (let i = 0; i < 30; i++) {
            const bubble = document.createElement('div');
            bubble.classList.add('bubble');
            
            const size = Math.random() * 20 + 5; 
            const left = Math.random() * 100;
            const duration = Math.random() * 5 + 4;
            const delay = Math.random() * 10;
            
            bubble.style.width = \`\${size}px\`;
            bubble.style.height = \`\${size}px\`;
            bubble.style.left = \`\${left}%\`;
            bubble.style.animationDuration = \`\${duration}s\`;
            bubble.style.animationDelay = \`-\${delay}s\`; // Negative delay starts them scattered
            
            bubbleContainer.appendChild(bubble);
        }
    }

    createBubbles();

    // Shuffle quotes
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    const shuffledQuotes = shuffleArray([...quotesData]);
    let currentIndex = 0;

    // Helper to get next quote
    function getNextQuote() {
        if (currentIndex >= shuffledQuotes.length) {
            currentIndex = 0;
            shuffleArray(shuffledQuotes);
        }
        return shuffledQuotes[currentIndex++];
    }

    function spawnMessage(initialRandomX = false) {
        const data = getNextQuote();
        
        // Wrap logic separating X-translation and Y-bobbing
        const wrapperEl = document.createElement('div');
        wrapperEl.className = 'floating-box';
        
        const direction = Math.floor(Math.random() * 2); // 0 or 1
        const topPos = Math.random() * 70 + 5; // 5% to 75% height to spread them all over
        const duration = Math.random() * 30 + 30; // 30s to 60s to drift across
        const bobDelay = Math.random() * 3;
        
        wrapperEl.style.top = \`\${topPos}%\`;
        
        // If initial random X, we set them mid-journey so screen isn't empty
        if (initialRandomX) {
            const randomJourneyProgress = Math.random() * duration;
            wrapperEl.style.animationDelay = \`-\${randomJourneyProgress}s\`;
        }
        
        const formattedQuote = data.quote.replace(/\\n/g, '<br>');

        // Same HTML structure as quote-card in index.html, modified for floating
        wrapperEl.innerHTML = \`
            <div class="bobbing-box" style="animation-delay: -\${bobDelay}s">
                <div class="quote-card floating-quote-card">
                    <span class="quote-mark left">“</span>
                    <p class="quote-text">"\${formattedQuote}"</p>
                    <span class="quote-mark right">”</span>
                    <p class="quote-author">จาก \${data.name}</p>
                </div>
            </div>
        \`;

        // Apply flow direction
        if (direction === 0) {
            wrapperEl.classList.add('flow-ltr');
            wrapperEl.style.animationDuration = \`\${duration}s\`;
        } else {
            wrapperEl.classList.add('flow-rtl');
            wrapperEl.style.animationDuration = \`\${duration}s\`;
        }

        // Slight tilt
        const tilt = (Math.random() - 0.5) * 6; // -3 to +3 deg
        wrapperEl.querySelector('.quote-card').style.transform = \`rotate(\${tilt}deg)\`;
        
        // Random scale for depth effect (some are smaller/further, some bigger/closer)
        const scale = Math.random() * 0.4 + 0.6; // 0.6 to 1.0
        wrapperEl.style.transform = \`scale(\${scale})\`;
        wrapperEl.style.zIndex = Math.floor(scale * 100);

        container.appendChild(wrapperEl);

        // Auto remove element once safely offscreen
        // Only if it's not starting with a negative delay (initial spawn)
        if (!initialRandomX) {
            setTimeout(() => {
                if (wrapperEl.parentNode) wrapperEl.parentNode.removeChild(wrapperEl);
            }, duration * 1000);
        }
    }

    // Instantly fill the screen with ~20 scattered messages
    for (let i = 0; i < 20; i++) {
        spawnMessage(true);
    }

    // Keep continuously spawning new ones over time
    setInterval(() => {
        spawnMessage(false);
    }, 4000);
});
