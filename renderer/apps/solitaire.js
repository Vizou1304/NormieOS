function openSolitaire() {
    const body = window.createNativeWindow('SOLITAIRE', '');
    const win  = body.closest('.os-window');
    if (win) { win.style.width = '900px'; win.style.height = '660px'; }
    body.style.cssText = 'padding:0;background:#48494b;user-select:none;overflow:hidden;position:relative;';

    const SUITS = ['♠','♥','♦','♣'];
    const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    const isRed = s => s === '♥' || s === '♦';
    const rv    = r => RANKS.indexOf(r);
    const CW = 66, CH = 90;
    const COL_X = c => 14 + c * (CW + 10);
    const TOP_Y = 12, TAB_Y = TOP_Y + CH + 16;
    const D_OFF = 16, U_OFF = 22;

    let stock = [], waste = [], found = [[],[],[],[]], tab = [[],[],[],[],[],[],[]];
    let sel = null;

    const shuffle = a => { for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

    const BACK_DOTS = (() => { let s=''; for(let r=0;r<6;r++) for(let c=0;c<4;c++) s+=`<rect x="${7+c*13}" y="${7+r*13}" width="5" height="5" fill="#e3e5e4" opacity="${(r+c)%2===0?'0.55':'0.2'}"/>`; return s; })();

    const svgBack  = () => `<svg width="${CW}" height="${CH}" xmlns="http://www.w3.org/2000/svg"><rect width="${CW}" height="${CH}" fill="#48494b" stroke="#e3e5e4" stroke-width="1"/>${BACK_DOTS}</svg>`;
    const svgEmpty = (lbl='') => `<svg width="${CW}" height="${CH}" xmlns="http://www.w3.org/2000/svg"><rect width="${CW}" height="${CH}" fill="none" stroke="#e3e5e4" stroke-width="1" stroke-dasharray="4 2"/>${lbl?`<text x="${CW/2}" y="${CH/2+5}" font-family="Courier New" font-size="13" text-anchor="middle" fill="#48494b" opacity="0.4">${lbl}</text>`:''}</svg>`;
    const svgFace  = (card, hi=false) => { const it=isRed(card.s)?'font-style="italic"':''; return `<svg width="${CW}" height="${CH}" xmlns="http://www.w3.org/2000/svg"><rect width="${CW}" height="${CH}" fill="#e3e5e4" stroke="${hi?'#e3e5e4':'#48494b'}" stroke-width="${hi?3:1}"/><text x="3" y="13" font-family="Courier New" font-size="11" font-weight="bold" fill="#48494b" ${it}>${card.r}</text><text x="3" y="24" font-family="Courier New" font-size="11" fill="#48494b">${card.s}</text><text x="${CW/2}" y="${CH/2+9}" font-family="Courier New" font-size="22" text-anchor="middle" fill="#48494b" ${it}>${card.s}</text><text x="${CW-3}" y="${CH-3}" font-family="Courier New" font-size="11" font-weight="bold" fill="#48494b" text-anchor="end" transform="rotate(180 ${CW-3} ${CH-3})" ${it}>${card.r}${card.s}</text></svg>`; };

    const getSelCards  = () => { if(!sel) return []; if(sel.type==='waste') return [waste[waste.length-1]]; if(sel.type==='found') return [found[sel.fi][found[sel.fi].length-1]]; if(sel.type==='tab') return tab[sel.col].slice(sel.idx); return []; };
    const removeSelected = () => { if(!sel) return; if(sel.type==='waste') waste.pop(); else if(sel.type==='found') found[sel.fi].pop(); else if(sel.type==='tab') tab[sel.col].splice(sel.idx); sel=null; };
    const autoFound    = card => { for(let fi=0;fi<4;fi++){const p=found[fi];const t=p[p.length-1]; if((!t&&card.r==='A')||(t&&t.s===card.s&&rv(card.r)===rv(t.r)+1)) return fi;} return -1; };

    const newGame = () => {
        const deck = [];
        for (let si=0;si<SUITS.length;si++) for (let ri=0;ri<RANKS.length;ri++) deck.push({s:SUITS[si],r:RANKS[ri],up:false});
        shuffle(deck);
        tab=Array.from({length:7},()=>[]); found=Array.from({length:4},()=>[]); waste=[]; sel=null;
        let idx=0;
        for(let c=0;c<7;c++) for(let row=0;row<=c;row++){const cd={s:deck[idx].s,r:deck[idx].r,up:(row===c)};idx++;tab[c].push(cd);}
        stock=deck.slice(idx).map(c=>({s:c.s,r:c.r,up:false}));
        render();
    };

    const handleClick = pos => {
        if (pos==='stock') {
            sel=null;
            if(!stock.length){stock=[...waste].reverse().map(c=>({...c,up:false}));waste=[];}
            else{const c=stock.pop();c.up=true;waste.push(c);}
            render(); return;
        }
        if (pos==='waste') {
            if(!waste.length){sel=null;render();return;}
            if(sel?.type==='waste'){sel=null;render();return;}
            sel={type:'waste'}; render(); return;
        }
        if (pos.startsWith('found-')) {
            const fi=+pos.split('-')[1];
            if(!sel){if(found[fi].length)sel={type:'found',fi};render();return;}
            const cards=getSelCards();
            if(cards.length!==1){sel=null;render();return;}
            const card=cards[0],pile=found[fi],top=pile[pile.length-1];
            if((!top&&card.r==='A')||(top&&top.s===card.s&&rv(card.r)===rv(top.r)+1)){removeSelected();pile.push(card);}
            else sel=null;
            render(); return;
        }
        if (pos.startsWith('tab-')) {
            const parts=pos.split('-'), col=+parts[1], hasIdx=parts.length>2, idx=hasIdx?+parts[2]:tab[col].length, cards=tab[col];
            if(!hasIdx||idx>=cards.length){
                if(!sel){render();return;}
                const mv=getSelCards();
                if(mv[0].r!=='K'||cards.length){sel=null;render();return;}
                removeSelected();cards.push(...mv);render();return;
            }
            const card=cards[idx];
            if(!card.up){if(idx===cards.length-1){card.up=true;sel=null;render();}return;}
            if(sel?.type==='tab'&&sel.col===col&&idx>=sel.idx){sel=null;render();return;}
            if(!sel){sel={type:'tab',col,idx};render();return;}
            if(idx!==cards.length-1){sel=null;render();return;}
            const mv=getSelCards();
            const valid=isRed(card.s)!==isRed(mv[0].s)&&rv(mv[0].r)===rv(card.r)-1;
            if(valid){removeSelected();cards.push(...mv);}else sel=null;
            render(); return;
        }
    };

    const render = () => {
        body.innerHTML='';
        const won=found.every(f=>f.length===13);
        const score=found.reduce((s,f)=>s+f.length,0);
        const add=(x,y,html,pos)=>{const d=document.createElement('div');d.style.cssText=`position:absolute;left:${x}px;top:${y}px;cursor:pointer;`;d.innerHTML=html;if(pos)d.dataset.pos=pos;body.appendChild(d);};
        const nb=document.createElement('button');
        nb.innerText='[ NEW GAME ]';
        nb.style.cssText=`position:absolute;top:${TOP_Y+2}px;left:${COL_X(2)}px;z-index:1;font-family:'Courier New',monospace;font-size:10px;background:#48494b;color:#e3e5e4;border:1px solid #e3e5e4;padding:3px 8px;cursor:pointer;`;
        nb.onclick=newGame; body.appendChild(nb);
        const sd=document.createElement('div');
        sd.innerText=won?'◆ YOU WIN ◆':`SCORE: ${score}/52`;
        sd.style.cssText=`position:absolute;top:${TOP_Y+4}px;left:${COL_X(3)}px;font-family:'Courier New',monospace;font-size:11px;color:#e3e5e4;${won?'font-weight:bold;letter-spacing:2px;':''}`;
        body.appendChild(sd);
        add(COL_X(0),TOP_Y,stock.length?svgBack():svgEmpty('↺'),'stock');
        waste.length?add(COL_X(1),TOP_Y,svgFace(waste[waste.length-1],sel?.type==='waste'),'waste'):add(COL_X(1),TOP_Y,svgEmpty(),'waste');
        ['♠','♥','♦','♣'].forEach((lbl,fi)=>{const p=found[fi],hi=sel?.type==='found'&&sel.fi===fi;add(COL_X(3+fi),TOP_Y,p.length?svgFace(p[p.length-1],hi):svgEmpty(lbl),`found-${fi}`);});
        for(let col=0;col<7;col++){
            const cx=COL_X(col),cards=tab[col];
            if(!cards.length){add(cx,TAB_Y,svgEmpty('K'),`tab-${col}`);continue;}
            let yy=TAB_Y;
            for(let ci=0;ci<cards.length;ci++){const card=cards[ci];const hi=sel?.type==='tab'&&sel.col===col&&ci>=sel.idx;add(cx,yy,card.up?svgFace(card,hi):svgBack(),`tab-${col}-${ci}`);yy+=card.up?U_OFF:D_OFF;}
        }
    };

    body.addEventListener('click', e => {
        const el=e.target.closest('[data-pos]');
        if(el) handleClick(el.dataset.pos);
    });
    body.addEventListener('dblclick', e => {
        const el=e.target.closest('[data-pos]');
        if(!el) return;
        const pos=el.dataset.pos;
        let card=null,srcType=null,srcCol=null;
        if(pos==='waste'&&waste.length){card=waste[waste.length-1];srcType='waste';}
        else if(pos.startsWith('tab-')){const p=pos.split('-');const col=+p[1];if(p.length>2){const ci=+p[2];if(ci===tab[col].length-1&&tab[col][ci]?.up){card=tab[col][ci];srcType='tab';srcCol=col;}}}
        if(!card) return;
        const fi=autoFound(card);
        if(fi>=0){if(srcType==='waste')waste.pop();else tab[srcCol].splice(tab[srcCol].length-1);found[fi].push(card);sel=null;render();}
    });

    newGame();
}
