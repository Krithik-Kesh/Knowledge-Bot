import imgMcAsphallt20211 from "./b3587d2f40f699fe69613ac90a5845c929850121.png";

function UserPrompt() {
  return (
    <div className="absolute contents left-[53px] top-[194px]" data-name="user prompt">
      <div className="absolute bg-[#141414] h-[120px] left-[53px] rounded-[16px] top-[194px] w-[326px]" />
      <p className="[word-break:break-word] absolute font-['Inter:Regular',sans-serif] font-normal h-[100px] leading-[normal] left-[60px] not-italic text-[16px] text-white top-[204px] w-[311px]">I am a plant worker and this is where the user prompt is displayed. To ask a question, you can either use the mic button to use voice to text or click the bottom button to use the keyboard</p>
    </div>
  );
}

export default function Chat() {
  return (
    <div className="bg-gradient-to-b from-[#32363e] from-[77.837%] relative size-full to-[#cf2128]" data-name="Chat - 2">
      <div className="absolute h-[120px] left-[23px] top-[66px] w-[356px]" data-name="Header">
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
      <div className="[word-break:break-word] absolute font-['Inter:Regular',sans-serif] font-normal h-[552px] leading-[0] left-[23px] not-italic text-[0px] text-white top-[322px] w-[357px] whitespace-pre-wrap">
        <p className="leading-[1.36] mb-0 text-[18px]">This is where you would see the response from the assistant. It would text to speech the response as well as display the response in text.</p>
        <p className="leading-[1.36] mb-0 text-[18px]">​</p>
        <p className="font-['Inter:Bold',sans-serif] font-bold leading-[1.36] mb-0 text-[20px]">Step 1: Fake Step For Visual Demo</p>
        <p className="leading-[1.36] mb-0 text-[18px]">{`Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. `}</p>
        <p className="leading-[1.36] mb-0 text-[18px]">​</p>
        <p className="font-['Inter:Bold',sans-serif] font-bold leading-[1.36] mb-0 text-[20px]">Step 2: More blabber</p>
        <p className="leading-[1.36] text-[18px]">Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Hello hello secret message woooooooo</p>
      </div>
      <UserPrompt />
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