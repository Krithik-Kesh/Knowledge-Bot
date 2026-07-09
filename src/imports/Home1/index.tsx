import imgMcAsphallt20211 from "./b3587d2f40f699fe69613ac90a5845c929850121.png";
import imgMicrophoneIconTransparent1 from "./79323499d2d11169443db3180c13e1ae042ad6fe.png";

function Header({ className }: { className?: string }) {
  return (
    <div className={className || "absolute h-[120px] left-[23px] top-[66px] w-[356px]"} data-name="Header">
      <div className="absolute inset-[70%_0_30%_0]" data-name="Dotted Line">
        <div className="absolute inset-[-3px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 356 3">
            <line id="Dotted Line" stroke="var(--stroke-0, white)" strokeDasharray="5 6" strokeLinecap="round" strokeWidth="3" x1="1.5" x2="354.5" y1="1.5" y2="1.5" />
          </svg>
        </div>
      </div>
      <div className="-translate-x-1/2 [word-break:break-word] absolute bottom-[3.33%] flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold justify-center leading-[0] left-1/2 not-italic text-[23px] text-center text-white top-[70%] tracking-[-0.46px] w-[356px]">
        <p className="leading-[1.4]">McAsphalt Operations Assistant</p>
      </div>
      <div className="absolute h-[70px] left-[129px] top-0 w-[98px]" data-name="McAsphallt-2021 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgMcAsphallt20211} />
      </div>
    </div>
  );
}

function Text({ className }: { className?: string }) {
  return (
    <div className={className || "absolute drop-shadow-[0px_4px_2px_rgba(0,0,0,0.25)] h-[72px] left-[63px] top-[498px] w-[275px]"} data-name="Text">
      <div className="[word-break:break-word] absolute flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold inset-0 justify-center leading-[0] not-italic text-[20px] text-center text-white tracking-[-0.4px]">
        <p className="leading-[1.4]">How can I help?</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-[#32363e] from-[32.208%] relative size-full to-[#cf2128] to-[99.993%]" data-name="Home - 1">
      <Header />
      <Text />
      <div className="absolute left-[136px] size-[130px] top-[382px]" data-name="Microphone Button">
        <div className="absolute aspect-[130/130] bg-white border-4 border-[#cf2128] border-solid left-0 right-0 rounded-[65px] shadow-[0px_0px_35px_15px_rgba(255,134,134,0.43)] top-0" data-name="Box" />
        <div className="absolute aspect-[630/1216] left-[31.54%] right-[32.31%] top-[19px]" data-name="microphone-icon-transparent 1">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgMicrophoneIconTransparent1} />
        </div>
      </div>
      <div className="absolute content-stretch flex h-[49px] items-center justify-center left-[53px] px-[60px] py-[5px] rounded-[35px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] top-[787px] w-[295px]" data-name="Type Box">
        <div aria-hidden className="absolute bg-[rgba(72,72,72,0.29)] inset-0 pointer-events-none rounded-[35px]" />
        <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[24px] text-center text-white tracking-[-0.48px] whitespace-nowrap">
          <p className="leading-[1.4]">Tap to type</p>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]" />
      </div>
    </div>
  );
}