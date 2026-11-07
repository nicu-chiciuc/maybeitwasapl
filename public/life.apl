⍝ Conway's Game of Life, and the website around it.
⍝ A Cloudflare Durable Object loads this file into ngn/apl, an APL interpreter written in JavaScript.
⍝ It holds one board for everyone, steps it twice a second while someone is watching,
⍝ and sends each new frame to every browser. The browser only shows what it gets.
⍝ ngn/apl counts from 0 (⎕IO←0), and its ⍕ returns a matrix, so ,⍕ makes a string.

size←40 64

⍝ One generation, after John Scholes.
step←{⊃1 ⍵∨.∧3 4=+/,¯1 0 1∘.⊖¯1 0 1∘.⌽⊂⍵}

⍝ A random board: about one cell in four alive.
seed←{0=?⍵⍴4}

⍝ ⍺ is the board before ⍵. Step ⍵, and start again when the board stops or blinks in place.
tick←{n←step ⍵ ⋄ (n≡⍵)∨n≡⍺:seed ⍴⍵ ⋄ n}

⍝ Flip the cells at the indices ⍺ of the flattened board.
flip←{(⍴⍵)⍴(,⍵)≠(⍳×/⍴⍵)∊⍺}

⍝ A frame: the generation ⍺ and the board ⍵ as HTML, <b> for a live cell and <i> for a dead one.
frame←{
  cols←'grid-template-columns:repeat(',(,⍕1⊃⍴⍵),',1fr)'
  head←'<p>generation ',(,⍕⍺),' · ',(,⍕+/,⍵),' alive</p>'
  head,'<div id="b" style="',cols,'">',(∊('<i></i>' '<b></b>')[,⍵]),'</div>'
}

css←'body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0d0d;color:#d8d8d8;font:15px/1.5 ui-monospace,Menlo,monospace}'
css←css,'main{width:min(92vw,960px)}h1{font-size:28px;margin:0 0 8px}a{color:#8fd3ff}'
css←css,'#b{display:grid;gap:1px;margin-top:8px;cursor:crosshair}#b i,#b b{aspect-ratio:1;background:#1c1c1c}#b b{background:#8fd3ff}'

⍝ The whole page, around the frame ⍺ frame ⍵.
page←{
  top←'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
  top←top,'<title>This website was built in APL.</title><style>',css,'</style><main>'
  top←top,'<h1>This website was built in APL.</h1>'
  top←top,'<p>No React, no JSX, no framework. Just APL, on the server too.</p>'
  top←top,'<p>Everyone sees the same board. Click a cell to flip it.</p>'
  end←'<p><a href="/life.apl">View the APL source</a> · runs on <a href="https://github.com/abrudz/ngn-apl">ngn/apl</a> in a Cloudflare Durable Object</p>'
  top,'<section id="life">',(⍺ frame ⍵),'</section>',end,'</main><script src="/client.js"></script></html>'
}
