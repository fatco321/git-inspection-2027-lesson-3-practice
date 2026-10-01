import "./dialogue.css";

export type DialogueLine = {
  speaker: string;
  portrait?: string;
  text: string;
  nextLabel?: string;
};

/** DOM presentation only; scene controls when the conversation begins. */
export class DialogueWindow {
  private readonly panel = document.createElement("section");
  private readonly portrait = document.createElement("img");
  private readonly name = document.createElement("h2");
  private readonly text = document.createElement("p");
  private readonly next = document.createElement("button");
  private lines: readonly DialogueLine[] = [];
  private index = 0;
  private onComplete?: () => void;
  private previousFocus: HTMLElement | null = null;

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  constructor(
    private readonly onActiveChange: (active: boolean) => void,
    private readonly onLineChange?: (line: DialogueLine, index: number) => void,
  ) {
    this.panel.className = "dialogue-window";
    this.panel.hidden = true;
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-labelledby", "dialogue-speaker");
    this.panel.setAttribute("aria-describedby", "dialogue-line");
    this.portrait.className = "dialogue-portrait";
    this.name.id = "dialogue-speaker";
    this.text.id = "dialogue-line";
    this.text.setAttribute("aria-live", "polite");
    this.next.type = "button";
    this.next.textContent = "Далее";
    this.next.addEventListener("click", this.advance);
    const content = document.createElement("div");
    content.className = "dialogue-content";
    content.append(this.name, this.text, this.next);
    this.panel.append(this.portrait, content);
    document.body.append(this.panel);
  }

  setTabletReady(ready:boolean){
    const wasWaiting=this.panel.classList.contains('tablet-opening');
    this.panel.classList.toggle('tablet-opening',!ready);this.panel.inert=!ready;
    if(wasWaiting&&ready&&this.isOpen)this.next.focus({preventScroll:true});
  }
  anchor(x:number,y:number){this.panel.style.setProperty('--anchor-x',x+'px');this.panel.style.setProperty('--anchor-y',y+'px');}

  open(lines: readonly DialogueLine[], onComplete?: () => void): void {
    if (!lines.length || this.isOpen) return;
    this.lines = lines;
    this.onComplete = onComplete;
    this.index = 0;
    this.previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    this.renderLine();
    this.panel.hidden = false;
    this.onActiveChange(true);
    this.next.focus({ preventScroll: true });
  }

  private renderLine(): void {
    const line = this.lines[this.index];
    this.panel.scrollTop = 0;
    this.name.textContent = line.speaker;
    this.text.textContent = line.text;
    this.next.textContent = line.nextLabel ?? "Далее";
    this.portrait.hidden = !line.portrait;
    this.panel.classList.toggle("dialogue-window--no-portrait", !line.portrait);
    if (line.portrait) this.portrait.src = line.portrait;
    else this.portrait.removeAttribute("src");
    this.portrait.alt = line.speaker;
    this.onLineChange?.(line, this.index);
  }

  private readonly advance = (): void => {
    if (!this.isOpen) return;
    if (++this.index < this.lines.length) this.renderLine();
    else {
      this.panel.hidden = true;
      this.onActiveChange(false);
      this.previousFocus?.focus({ preventScroll: true });
      const complete = this.onComplete;
      this.onComplete = undefined;
      complete?.();
    }
  };

  dispose(): void {
    this.onComplete = undefined;
    this.next.removeEventListener("click", this.advance);
    this.panel.remove();
  }
}
