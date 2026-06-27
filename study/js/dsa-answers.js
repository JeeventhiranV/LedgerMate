/* ============================================================================
 * dsa-answers.js  —  Interview-ready answer content for DSA_CodeBase.html
 * ----------------------------------------------------------------------------
 * Each entry is keyed by the problem number shown on its card (the text inside
 * .problem-num, with a leading "#" stripped). The answer drawer in
 * DSA_CodeBase.html reads window.DSA_ANSWERS[key] and renders { title,
 * difficulty, id, topic, html }.
 *
 * Java code targets Java 17. HTML special chars inside code blocks are escaped
 * (&lt; &gt; &amp;). Reusable CSS hooks: .code-block, .cc (comment), .ans-callout
 * (.tip/.warn/.trap), .ans-cx (complexity), .ans-chip, tables.
 *
 * Coverage so far: ARRAYS (Basics · Two Pointers · Sliding Window · Hashing ·
 * Rotation/Sorting). Other topics are appended as additional Object.assign
 * blocks following the same shape.
 * ==========================================================================*/
window.DSA_ANSWERS = window.DSA_ANSWERS || {};

/* ════════════════════════ ARRAYS · BASICS ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "1929": {
    id: "LC #1929", title: "Concatenation of Array", difficulty: "Easy", topic: "Arrays · Basics",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Array construction</span>
        <span class="ans-chip">Time O(n)</span>
        <span class="ans-chip">Space O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Given an array <code>nums</code> of length <code>n</code>, return an array <code>ans</code> of length <code>2n</code> where <code>ans[i] == nums[i]</code> and <code>ans[i + n] == nums[i]</code>. In short: return <code>nums</code> concatenated with itself.</p>
      <p>It is a warm-up that checks whether you can allocate a result array of the right size and index into two halves without an extra data structure.</p>

      <h3>How It Works</h3>
      <ul>
        <li>Allocate the result with size <code>2 * n</code> up front — never grow it dynamically.</li>
        <li>For each index <code>i</code>, write <code>nums[i]</code> into both <code>ans[i]</code> and <code>ans[i + n]</code> in a single pass.</li>
      </ul>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block"><span class="cc">// One pass, exact-size allocation — no resizing, no copy helper.</span>
public int[] getConcatenation(int[] nums) {
    int n = nums.length;
    int[] ans = new int[2 * n];
    for (int i = 0; i &lt; n; i++) {
        ans[i] = nums[i];        <span class="cc">// first copy</span>
        ans[i + n] = nums[i];    <span class="cc">// second copy</span>
    }
    return ans;
}</pre>
      <p><strong>Library alternative:</strong> <code>System.arraycopy(nums, 0, ans, 0, n)</code> twice is just as fast and very readable, but interviewers usually want to see the index math.</p>

      <h3>Complexity Analysis</h3>
      <table>
        <thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
        <tbody>
          <tr><td>One pass</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span> for output (O(1) extra)</td></tr>
        </tbody>
      </table>

      <h3>Dry Run</h3>
      <p><code>nums = [1,2,1]</code>, n = 3, ans has size 6.</p>
      <ul>
        <li>i=0 → ans[0]=1, ans[3]=1</li>
        <li>i=1 → ans[1]=2, ans[4]=2</li>
        <li>i=2 → ans[2]=1, ans[5]=1</li>
      </ul>
      <p>Result: <code>[1,2,1,1,2,1]</code> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Single element <code>[5] → [5,5]</code>; the loop bound is <code>i &lt; n</code> (never <code>2n</code>); the problem guarantees <code>n ≥ 1</code> so no empty-array branch is needed but handle it defensively in production.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Looping to <code>2 * n</code> and using modulo <code>nums[i % n]</code> works but is slower to reason about and easy to off-by-one. The two-write-per-iteration form is cleaner.</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Can you do it without extra space?</strong> The output array itself is required, so O(n) output is unavoidable; extra working space is O(1).</li>
        <li><strong>How would you concatenate k copies?</strong> Outer loop over copies, inner over <code>nums</code>, writing to <code>ans[copy * n + i]</code>.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul>
        <li>Pre-size the output; avoid dynamic growth.</li>
        <li>Two writes per iteration beats modulo indexing for clarity.</li>
      </ul>`
  },

  "1480": {
    id: "LC #1480", title: "Running Sum of 1D Array", difficulty: "Easy", topic: "Arrays · Prefix Sum",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Prefix sum</span>
        <span class="ans-chip">In-place</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>The running sum at index <code>i</code> is <code>nums[0] + nums[1] + ... + nums[i]</code>. Return the array of running sums. This is the canonical <strong>prefix sum</strong> warm-up — the same technique powers range-sum queries, Subarray Sum Equals K, and many sliding-window problems.</p>

      <h3>How It Works</h3>
      <p>Each running sum equals the previous running sum plus the current element: <code>run[i] = run[i-1] + nums[i]</code>. Because each cell only depends on the one before it, we can update the array <strong>in place</strong>.</p>

      <h3>Java Code (Optimal, in-place)</h3>
      <pre class="code-block">public int[] runningSum(int[] nums) {
    for (int i = 1; i &lt; nums.length; i++) {
        nums[i] += nums[i - 1];   <span class="cc">// carry forward the prefix</span>
    }
    return nums;
}</pre>
      <p>If mutating the input is not allowed, allocate a new array of the same length and write <code>out[i] = out[i-1] + nums[i]</code>.</p>

      <h3>Complexity Analysis</h3>
      <table>
        <thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
        <tbody>
          <tr><td>Brute (re-sum each prefix)</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
          <tr><td>In-place prefix</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        </tbody>
      </table>

      <h3>Dry Run</h3>
      <p><code>nums = [1,2,3,4]</code> → i=1: 2+1=3 → [1,3,3,4]; i=2: 3+3=6 → [1,3,6,4]; i=3: 4+6=10 → <code>[1,3,6,10]</code> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>Prefix sums let you answer "sum of <code>nums[l..r]</code>" in O(1) as <code>pre[r] - pre[l-1]</code>. Mention this generalization — it shows you see the pattern, not just the puzzle.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Length 1 returns the array unchanged. Watch for <strong>integer overflow</strong> if values are large — use <code>long</code> for the accumulator when constraints allow big sums.</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Range sum queries?</strong> Build a prefix array once (O(n)), answer each query in O(1).</li>
        <li><strong>2D version?</strong> Use a 2D prefix sum (integral image) for O(1) submatrix sums.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Prefix sum turns repeated range work from O(n) per query to O(1).</li><li>In-place update is safe because each cell depends only on its predecessor.</li></ul>`
  },

  "1672": {
    id: "LC #1672", title: "Richest Customer Wealth", difficulty: "Easy", topic: "Arrays · 2D",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">2D traversal</span>
        <span class="ans-chip">Running max</span>
        <span class="ans-chip">Time O(m·n)</span>
      </div>

      <h3>Overview</h3>
      <p><code>accounts[i][j]</code> is the money customer <code>i</code> has in bank <code>j</code>. Wealth of a customer is the sum of their row. Return the <strong>maximum</strong> wealth across all customers.</p>

      <h3>How It Works</h3>
      <p>Sum each row, track the largest row-sum seen so far. No sorting or extra storage needed — a single max variable suffices.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int maximumWealth(int[][] accounts) {
    int best = 0;
    for (int[] customer : accounts) {     <span class="cc">// each row = one customer</span>
        int wealth = 0;
        for (int money : customer) wealth += money;
        best = Math.max(best, wealth);    <span class="cc">// running maximum</span>
    }
    return best;
}</pre>

      <h3>Complexity Analysis</h3>
      <table>
        <thead><tr><th>Metric</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>Time</td><td><span class="ans-cx">O(m · n)</span> — every cell visited once</td></tr>
          <tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr>
        </tbody>
      </table>

      <h3>Dry Run</h3>
      <p><code>[[1,5],[7,3],[3,5]]</code> → rows sum to 6, 10, 8 → max = <code>10</code> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>All values are positive per constraints, so initializing <code>best = 0</code> is safe; if negatives were allowed, initialize to <code>Integer.MIN_VALUE</code>.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>Use the enhanced for-loop over rows — it reads cleanly and avoids index errors. Mention you cannot beat O(m·n) since you must read every cell at least once.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Row-sum + running max is the whole problem.</li><li>You must touch every element, so O(m·n) is optimal.</li></ul>`
  },

  "1470": {
    id: "LC #1470", title: "Shuffle the Array", difficulty: "Easy", topic: "Arrays · Basics",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Index mapping</span>
        <span class="ans-chip">Interleave</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Given <code>nums = [x1..xn, y1..yn]</code> (length <code>2n</code>), return <code>[x1,y1,x2,y2,...,xn,yn]</code> — interleave the first half with the second half.</p>

      <h3>How It Works</h3>
      <p>The <code>i</code>-th x lives at <code>nums[i]</code>; the <code>i</code>-th y lives at <code>nums[i + n]</code>. Place them at output positions <code>2i</code> and <code>2i + 1</code>.</p>

      <h3>Java Code (Optimal, extra array)</h3>
      <pre class="code-block">public int[] shuffle(int[] nums, int n) {
    int[] ans = new int[2 * n];
    for (int i = 0; i &lt; n; i++) {
        ans[2 * i]     = nums[i];       <span class="cc">// x_i to even slot</span>
        ans[2 * i + 1] = nums[i + n];   <span class="cc">// y_i to odd slot</span>
    }
    return ans;
}</pre>

      <div class="ans-callout tip"><span class="ans-callout-label">Follow-up: O(1) space</span>Encode two numbers in one slot using bit-packing (values fit in 10 bits per constraints): store <code>nums[i] = nums[i] | (nums[j] &lt;&lt; 10)</code>, then a second pass extracts low/high 10 bits into interleaved order. Only attempt this if asked — it trades clarity for space.</div>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Extra array</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td>Bit-packing in place</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>nums=[2,5,1,3,4,7], n=3</code> → x=[2,5,1], y=[3,4,7] → <code>[2,3,5,4,1,7]</code> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Common mistake</span>Confusing the output stride — even indices get x, odd indices get y. Double-check with a tiny n=1 example.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Map source indices (<code>i</code>, <code>i+n</code>) to destination indices (<code>2i</code>, <code>2i+1</code>).</li><li>Bit-packing is the classic O(1)-space trick when values are bounded.</li></ul>`
  },

  "832": {
    id: "LC #832", title: "Flipping an Image", difficulty: "Easy", topic: "Arrays · 2D",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Two pointers</span>
        <span class="ans-chip">In-place</span>
        <span class="ans-chip">XOR trick</span>
      </div>

      <h3>Overview</h3>
      <p>For each row of a binary matrix: <strong>reverse</strong> it horizontally, then <strong>invert</strong> it (0↔1). Both steps can be fused into one pass per row.</p>

      <h3>How It Works</h3>
      <p>Use two pointers <code>l</code> and <code>r</code> moving toward the center. Reversing swaps <code>row[l]</code> and <code>row[r]</code>; inverting flips each bit. Flipping a bit is <code>1 - bit</code> or <code>bit ^ 1</code>. When <code>l == r</code> (odd width middle), just invert that single cell.</p>

      <h3>Java Code (Optimal, fused)</h3>
      <pre class="code-block">public int[][] flipAndInvertImage(int[][] image) {
    for (int[] row : image) {
        int l = 0, r = row.length - 1;
        while (l &lt; r) {
            int tmp = row[l] ^ 1;     <span class="cc">// invert while swapping</span>
            row[l] = row[r] ^ 1;
            row[r] = tmp;
            l++; r--;
        }
        if (l == r) row[l] ^= 1;      <span class="cc">// middle cell (odd length)</span>
    }
    return image;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(m · n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> (in place)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>Row <code>[1,1,0]</code> → reverse <code>[0,1,1]</code> → invert <code>[1,0,0]</code>. Fused: l=0,r=2 → swap+invert gives [1,_,0]; middle l=r=1 → invert 1→0 → <code>[1,0,0]</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Forgetting the middle cell when the row length is odd — without <code>if (l == r) row[l] ^= 1;</code> the center stays un-inverted.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span><code>x ^ 1</code> flips a bit in O(1) and signals bit-manipulation fluency. <code>1 - x</code> is equally valid and more readable for non-bit folks.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Fuse reverse + invert into one two-pointer sweep.</li><li>Handle the odd-length middle separately.</li></ul>`
  },

  "2239": {
    id: "LC #2239", title: "Find Closest Number to Zero", difficulty: "Easy", topic: "Arrays · Basics",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Linear scan</span>
        <span class="ans-chip">Tie-breaking</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return the number with the smallest absolute value. <strong>Tie-breaker:</strong> if two numbers are equally close to zero (e.g. <code>-3</code> and <code>3</code>), return the <strong>larger</strong> one (the positive).</p>

      <h3>How It Works</h3>
      <p>Single pass tracking the best candidate. Update when the current element is strictly closer, OR equally close but larger.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int findClosestNumber(int[] nums) {
    int best = nums[0];
    for (int x : nums) {
        if (Math.abs(x) &lt; Math.abs(best)
            || (Math.abs(x) == Math.abs(best) &amp;&amp; x &gt; best)) {
            best = x;                 <span class="cc">// closer, or tie -> prefer larger</span>
        }
    }
    return best;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[-4,-2,1,4,8]</code> → abs = [4,2,1,4,8]; closest abs=1 at value <code>1</code> ✓. For <code>[-3,3]</code> both abs=3, tie → return <code>3</code>.</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Ignoring the tie rule and returning whichever appears first. The positive must win ties — that is the whole trick of this problem.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Single element → return it. <code>Math.abs(Integer.MIN_VALUE)</code> overflows; constraints here keep |value| small, but mention <code>long</code> casting if asked about extreme inputs.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Combine the closeness test and tie-break into one condition.</li><li>Always clarify tie-breaking rules with the interviewer.</li></ul>`
  }

});

/* ════════════════════════ ARRAYS · TWO POINTERS ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "88": {
    id: "LC #88", title: "Merge Sorted Array", difficulty: "Easy", topic: "Arrays · Two Pointers",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Two pointers</span>
        <span class="ans-chip">Merge from back</span>
        <span class="ans-chip">In-place</span>
      </div>

      <h3>Overview</h3>
      <p><code>nums1</code> has size <code>m + n</code> with the first <code>m</code> slots valid and the last <code>n</code> slots as zero padding; <code>nums2</code> has <code>n</code> valid elements. Merge <code>nums2</code> into <code>nums1</code> so <code>nums1</code> is sorted — <strong>in place</strong>.</p>

      <h3>Why Merge From the Back</h3>
      <p>If you merge from the front, you would overwrite unprocessed <code>nums1</code> values. The free space is at the <strong>end</strong> of <code>nums1</code>, so filling from the largest element backward never clobbers data you still need.</p>

      <h3>Java Code (Optimal — O(1) space)</h3>
      <pre class="code-block">public void merge(int[] nums1, int m, int[] nums2, int n) {
    int i = m - 1;            <span class="cc">// last valid in nums1</span>
    int j = n - 1;            <span class="cc">// last in nums2</span>
    int k = m + n - 1;        <span class="cc">// write position (end)</span>
    while (j &gt;= 0) {          <span class="cc">// once nums2 is exhausted we're done</span>
        if (i &gt;= 0 &amp;&amp; nums1[i] &gt; nums2[j]) {
            nums1[k--] = nums1[i--];
        } else {
            nums1[k--] = nums2[j--];
        }
    }
}</pre>
      <p>The loop ends when <code>j &lt; 0</code> because any remaining <code>nums1</code> elements are already in their correct sorted positions.</p>

      <h3>Approaches Compared</h3>
      <table>
        <thead><tr><th>Approach</th><th>Time</th><th>Space</th><th>Note</th></tr></thead>
        <tbody>
          <tr><td>Copy + Arrays.sort</td><td><span class="ans-cx">O((m+n)log(m+n))</span></td><td><span class="ans-cx">O(1)</span></td><td>Ignores that inputs are sorted</td></tr>
          <tr><td>Merge front w/ temp</td><td><span class="ans-cx">O(m+n)</span></td><td><span class="ans-cx">O(m)</span></td><td>Needs a copy</td></tr>
          <tr><td><strong>Merge from back</strong></td><td><span class="ans-cx">O(m+n)</span></td><td><span class="ans-cx">O(1)</span></td><td>Optimal</td></tr>
        </tbody>
      </table>

      <h3>Dry Run</h3>
      <p><code>nums1=[1,2,3,0,0,0], m=3, nums2=[2,5,6], n=3</code></p>
      <ul>
        <li>i=2,j=2,k=5: 3 vs 6 → place 6 → [1,2,3,0,0,6]</li>
        <li>i=2,j=1,k=4: 3 vs 5 → place 5 → [1,2,3,0,5,6]</li>
        <li>i=2,j=0,k=3: 3 vs 2 → place 3 → [1,2,2... ] wait place 3 → [1,2,3,3,5,6], i=1</li>
        <li>i=1,j=0,k=2: 2 vs 2 → else places 2 → [1,2,2,3,5,6], j=-1 → done ✓</li>
      </ul>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Looping while <code>i &gt;= 0 &amp;&amp; j &gt;= 0</code> only — then forgetting leftover <code>nums2</code>. Looping on <code>j &gt;= 0</code> (with the <code>i &gt;= 0</code> guard inside) handles everything cleanly.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span><code>m = 0</code> → copy all of nums2; <code>n = 0</code> → nums1 unchanged. The guard <code>i &gt;= 0</code> prevents out-of-bounds when nums1 empties first.</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Why not sort?</strong> Sorting throws away the sorted-input advantage and is asymptotically slower.</li>
        <li><strong>What if extra space is allowed?</strong> Standard two-pointer merge into a new array, then copy back — simpler but O(m) space.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Merge into spare capacity from the back to achieve O(1) space.</li><li>Drive the loop by the shorter source (<code>nums2</code>).</li></ul>`
  },

  "26": {
    id: "LC #26", title: "Remove Duplicates from Sorted Array", difficulty: "Easy", topic: "Arrays · Two Pointers",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Slow/fast pointers</span>
        <span class="ans-chip">In-place</span>
        <span class="ans-chip">Read/write index</span>
      </div>

      <h3>Overview</h3>
      <p>Remove duplicates from a <strong>sorted</strong> array in place so each unique value appears once. Return <code>k</code>, the count of uniques; the first <code>k</code> slots must hold them in order. This is the prototypical <strong>read/write pointer</strong> (a.k.a. slow/fast) pattern.</p>

      <h3>How It Works</h3>
      <p>A <code>write</code> pointer marks where the next unique value goes; a <code>read</code> pointer scans forward. Because the array is sorted, duplicates are adjacent — a new unique appears exactly when <code>nums[read] != nums[write-1]</code>.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int removeDuplicates(int[] nums) {
    if (nums.length == 0) return 0;
    int write = 1;                       <span class="cc">// nums[0] is always kept</span>
    for (int read = 1; read &lt; nums.length; read++) {
        if (nums[read] != nums[write - 1]) {
            nums[write++] = nums[read];  <span class="cc">// keep new unique</span>
        }
    }
    return write;                        <span class="cc">// k unique elements</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[0,0,1,1,2]</code>: write=1. read=1 (0==0 skip). read=2 (1≠0) → nums[1]=1, write=2. read=3 (1==1 skip). read=4 (2≠1) → nums[2]=2, write=3. Result first 3 = <code>[0,1,2]</code>, k=3 ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Empty array → return 0. All-same array → return 1. Single element → return 1.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Follow-up</span>"Allow at most 2 duplicates" (LC 80): compare against <code>nums[write - 2]</code> and start <code>write = 2</code>. Same template, different look-back distance.</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Why does sorted matter?</strong> It guarantees duplicates are contiguous; on an unsorted array you would need a HashSet (O(n) space).</li>
        <li><strong>Does order of remaining elements matter?</strong> Yes — must stay sorted/relative order, which this preserves.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Slow/fast pointers compact an array in place in one pass.</li><li>Comparing to <code>nums[write-1]</code> generalizes to "keep last k" variants.</li></ul>`
  },

  "977": {
    id: "LC #977", title: "Squares of a Sorted Array", difficulty: "Easy", topic: "Arrays · Two Pointers",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Two pointers</span>
        <span class="ans-chip">Fill from back</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Given a sorted array (may contain negatives), return the squares in sorted order. The naive "square then sort" is O(n log n); the two-pointer trick is O(n).</p>

      <h3>Key Insight</h3>
      <p>The largest square comes from whichever <strong>end</strong> has the largest magnitude — the most negative number or the most positive number. So compare the two ends, take the bigger square, and fill the result <strong>from the back</strong>.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int[] sortedSquares(int[] nums) {
    int n = nums.length;
    int[] res = new int[n];
    int l = 0, r = n - 1, pos = n - 1;   <span class="cc">// fill largest first</span>
    while (l &lt;= r) {
        int ls = nums[l] * nums[l];
        int rs = nums[r] * nums[r];
        if (ls &gt; rs) { res[pos--] = ls; l++; }
        else         { res[pos--] = rs; r--; }
    }
    return res;
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Square + Arrays.sort</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(1)/O(n)</span></td></tr>
        <tr><td><strong>Two pointers</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span> output</td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[-4,-1,0,3,10]</code>: ends 16 vs 100 → res[4]=100,r=3; 16 vs 9 → res[3]=16,l=1; 1 vs 9 → res[2]=9,r=2; 1 vs 0 → res[1]=1,l=2; l==r=2: 0 → res[0]=0. Result <code>[0,1,9,16,100]</code> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>All negatives → result is reverse of squares; all positives → squares already sorted. The <code>l &lt;= r</code> bound handles the single middle element.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Filling from the front. The two-pointer comparison naturally yields the <em>largest</em> remaining square, so you must write to the highest free index.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Largest magnitude lives at the ends of a sorted array.</li><li>Fill the output back-to-front when each step yields the current maximum.</li></ul>`
  },

  "15": {
    id: "LC #15", title: "3Sum", difficulty: "Medium", topic: "Arrays · Sort + Two Pointers",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Sort + two pointers</span>
        <span class="ans-chip">Dedup</span>
        <span class="ans-chip">Time O(n²)</span>
      </div>

      <h3>Overview</h3>
      <p>Find all <strong>unique</strong> triplets <code>[a,b,c]</code> with <code>a + b + c == 0</code>. The challenge is two-fold: find triplets efficiently, and avoid duplicate triplets in the output.</p>

      <h3>Strategy</h3>
      <p>Sort the array. Fix the first element <code>nums[i]</code>, then run a <strong>two-pointer</strong> scan on the rest for a pair summing to <code>-nums[i]</code>. Sorting makes both the two-pointer search and duplicate-skipping possible.</p>

      <h3>Approaches Compared</h3>
      <table>
        <thead><tr><th>Approach</th><th>Time</th><th>Space</th><th>Note</th></tr></thead>
        <tbody>
          <tr><td>Brute force (3 loops)</td><td><span class="ans-cx">O(n³)</span></td><td><span class="ans-cx">O(1)</span></td><td>Plus dedup via Set</td></tr>
          <tr><td>HashSet per pair</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(n)</span></td><td>Dedup is fiddly</td></tr>
          <tr><td><strong>Sort + two pointers</strong></td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)*</span></td><td>Cleanest dedup</td></tr>
        </tbody>
      </table>
      <p>*Ignoring the output and sort's recursion stack.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;List&lt;Integer&gt;&gt; threeSum(int[] nums) {
    Arrays.sort(nums);
    List&lt;List&lt;Integer&gt;&gt; res = new ArrayList&lt;&gt;();
    int n = nums.length;
    for (int i = 0; i &lt; n - 2; i++) {
        if (nums[i] &gt; 0) break;               <span class="cc">// smallest &gt; 0 -> no triplet possible</span>
        if (i &gt; 0 &amp;&amp; nums[i] == nums[i - 1]) continue; <span class="cc">// skip dup first element</span>
        int l = i + 1, r = n - 1;
        while (l &lt; r) {
            int sum = nums[i] + nums[l] + nums[r];
            if (sum &lt; 0) l++;
            else if (sum &gt; 0) r--;
            else {
                res.add(List.of(nums[i], nums[l], nums[r]));
                l++; r--;
                while (l &lt; r &amp;&amp; nums[l] == nums[l - 1]) l++;  <span class="cc">// skip dup</span>
                while (l &lt; r &amp;&amp; nums[r] == nums[r + 1]) r--;  <span class="cc">// skip dup</span>
            }
        }
    }
    return res;
}</pre>

      <h3>Dry Run</h3>
      <p><code>[-1,0,1,2,-1,-4]</code> → sorted <code>[-4,-1,-1,0,1,2]</code>.</p>
      <ul>
        <li>i=0 (-4): pairs to +4 — none.</li>
        <li>i=1 (-1): l=2(-1),r=5(2) sum 0 → <code>[-1,-1,2]</code>; move, skip dups; l=3(0),r=4(1) sum 0 → <code>[-1,0,1]</code>.</li>
        <li>i=2 (-1): duplicate of i=1 → skip.</li>
      </ul>
      <p>Result: <code>[[-1,-1,2],[-1,0,1]]</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Forgetting to skip duplicate <code>i</code> values → duplicate triplets. (2) Skipping inner duplicates only on one side. (3) Using a Set to dedup the whole result — works but wasteful; sorted skipping is cleaner.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Optimizations</span><code>if (nums[i] &gt; 0) break;</code> — once the fixed element is positive, no zero-sum triplet remains. Greatly prunes positive-heavy inputs.</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>kSum generalization?</strong> Recurse: kSum reduces to (k−1)Sum until k=2 (two pointers). Time <span class="ans-cx">O(n^{k−1})</span>.</li>
        <li><strong>3Sum Closest (LC 16)?</strong> Same scan, track minimum |sum − target| instead of equality.</li>
        <li><strong>Can you avoid sorting?</strong> Yes (hashing) but dedup becomes much harder; sorting is the standard answer.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Sort, fix one element, two-pointer the rest → O(n²).</li><li>Dedup at <em>both</em> the outer index and the two inner pointers.</li></ul>`
  },

  "42": {
    id: "LC #42", title: "Trapping Rain Water", difficulty: "Hard", topic: "Arrays · Two Pointers",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Two pointers</span>
        <span class="ans-chip">Prefix max</span>
        <span class="ans-chip">Monotonic stack</span>
      </div>

      <h3>Overview</h3>
      <p>Given bar heights, compute how much rainwater is trapped between them. Water above bar <code>i</code> equals <code>min(maxLeft[i], maxRight[i]) − height[i]</code> (clamped at 0). The art is computing those maxima efficiently.</p>

      <h3>Core Formula</h3>
      <p>Water trapped at index <code>i</code> = <code>min(tallest bar to the left, tallest bar to the right) − height[i]</code>. A cell holds water only if walls on both sides are taller than it.</p>

      <h3>Approaches Compared</h3>
      <table>
        <thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
        <tbody>
          <tr><td>Brute: scan L/R max per cell</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
          <tr><td>Prefix-max arrays</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
          <tr><td>Monotonic stack</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
          <tr><td><strong>Two pointers</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        </tbody>
      </table>

      <h3>Java Code (Optimal — two pointers, O(1) space)</h3>
      <pre class="code-block">public int trap(int[] height) {
    int l = 0, r = height.length - 1;
    int leftMax = 0, rightMax = 0, water = 0;
    while (l &lt; r) {
        if (height[l] &lt; height[r]) {
            <span class="cc">// left wall is the limiting side</span>
            if (height[l] &gt;= leftMax) leftMax = height[l];
            else water += leftMax - height[l];
            l++;
        } else {
            if (height[r] &gt;= rightMax) rightMax = height[r];
            else water += rightMax - height[r];
            r--;
        }
    }
    return water;
}</pre>
      <p><strong>Why it works:</strong> if <code>height[l] &lt; height[r]</code>, then <code>rightMax ≥ height[r] &gt; height[l]</code>, so the water at <code>l</code> is bounded purely by <code>leftMax</code> — we can safely settle it without knowing the exact right max.</p>

      <h4>Prefix-max version (easier to derive under pressure)</h4>
      <pre class="code-block">public int trap(int[] h) {
    int n = h.length; if (n == 0) return 0;
    int[] L = new int[n], R = new int[n];
    L[0] = h[0];
    for (int i = 1; i &lt; n; i++) L[i] = Math.max(L[i-1], h[i]);
    R[n-1] = h[n-1];
    for (int i = n-2; i &gt;= 0; i--) R[i] = Math.max(R[i+1], h[i]);
    int water = 0;
    for (int i = 0; i &lt; n; i++) water += Math.min(L[i], R[i]) - h[i];
    return water;
}</pre>

      <h3>Dry Run</h3>
      <p><code>[0,1,0,2,1,0,1,3,2,1,2,1]</code> → total trapped = <strong>6</strong>. E.g. index 2 (h=0): min(left max 1, right max 3) − 0 = 1 unit; index 5 (h=0): min(2,3) − 0 = 2 units, etc.</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Updating max <em>after</em> adding water (off-by-one — a bar can't trap water above itself). (2) Forgetting to clamp negatives — handled implicitly since we only add when <code>height &lt; max</code>.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>State the formula first, give the O(n)/O(n) prefix-max solution, then optimize to two pointers for O(1) space. Explaining <em>why</em> the smaller side is safe to settle is the differentiator.</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>2D version (LC 407)?</strong> Use a min-heap over the boundary, expanding inward (Dijkstra-like).</li>
        <li><strong>Why can two pointers ignore the far side's exact max?</strong> Because the side with the smaller current height is guaranteed bounded by its own running max.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Water = min(leftMax, rightMax) − height.</li><li>Two pointers converge from the smaller side for O(1) space.</li></ul>`
  },

  "167": {
    id: "LC #167", title: "Two Sum II — Input Array Is Sorted", difficulty: "Medium", topic: "Arrays · Two Pointers",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Two pointers</span>
        <span class="ans-chip">Sorted input</span>
        <span class="ans-chip">O(1) space</span>
      </div>

      <h3>Overview</h3>
      <p>The array is <strong>sorted (1-indexed)</strong>; return the 1-based indices of the two numbers adding up to <code>target</code>. Because it is sorted, we beat the HashMap version's space with two converging pointers.</p>

      <h3>How It Works</h3>
      <p>Start <code>l</code> at the smallest and <code>r</code> at the largest. The sum is monotonic with respect to pointer moves: if the sum is too small, increase it by moving <code>l</code> right; if too large, decrease it by moving <code>r</code> left.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int[] twoSum(int[] numbers, int target) {
    int l = 0, r = numbers.length - 1;
    while (l &lt; r) {
        int sum = numbers[l] + numbers[r];
        if (sum == target) return new int[]{ l + 1, r + 1 }; <span class="cc">// 1-indexed</span>
        if (sum &lt; target) l++;    <span class="cc">// need a bigger sum</span>
        else r--;                 <span class="cc">// need a smaller sum</span>
    }
    return new int[]{ -1, -1 };   <span class="cc">// problem guarantees a solution</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>HashMap (LC 1 style)</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td><strong>Two pointers</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>numbers=[2,7,11,15], target=9</code>: l=0,r=3 → 2+15=17&gt;9 → r=2; 2+11=13&gt;9 → r=1; 2+7=9 ✓ → return <code>[1,2]</code>.</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Why two pointers beat a HashMap here</span>The sorted property gives a direction signal, so we get O(1) space. On an <em>unsorted</em> array (LC 1), the HashMap is the right tool.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Duplicates are fine. Remember the 1-based indexing in the return value — a frequent slip.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Sorted array + pair-sum → converging two pointers, O(1) space.</li><li>The sum is monotonic in pointer position, which justifies the moves.</li></ul>`
  },

  "11": {
    id: "LC #11", title: "Container With Most Water", difficulty: "Medium", topic: "Arrays · Two Pointers",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Two pointers</span>
        <span class="ans-chip">Greedy</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Each element is a vertical line of a given height. Pick two lines that, with the x-axis, form a container holding the most water. Area = <code>width × min(height[l], height[r])</code>.</p>

      <h3>Key Insight (why greedy two pointers works)</h3>
      <p>Start with the widest container (both ends). The area is limited by the <strong>shorter</strong> wall. Moving the taller wall inward can only reduce width without raising the limiting height, so it can never help. Therefore always move the <strong>shorter</strong> wall inward — that is the only move with a chance to find a taller bound.</p>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Brute (all pairs)</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Two pointers</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int maxArea(int[] height) {
    int l = 0, r = height.length - 1, best = 0;
    while (l &lt; r) {
        int h = Math.min(height[l], height[r]);
        best = Math.max(best, h * (r - l));   <span class="cc">// width * limiting height</span>
        if (height[l] &lt; height[r]) l++;       <span class="cc">// move the shorter wall</span>
        else r--;
    }
    return best;
}</pre>

      <h3>Dry Run</h3>
      <p><code>[1,8,6,2,5,4,8,3,7]</code>: l=0(1),r=8(7) area=1×8=8, move l. l=1(8),r=8(7) area=7×7=<strong>49</strong>, move r. ... max stays 49 ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Moving the <em>taller</em> wall (or both). Only moving the shorter wall preserves correctness — moving the taller one strictly worsens or matches every future container.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Don't confuse with Trapping Rain Water</span>Here water spans between just two chosen lines (no inner bars matter). In LC 42, every bar contributes and inner bars displace water.</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Prove the greedy.</strong> The optimal pair's shorter wall is never skipped: we only advance past a wall after it was the limiting (shorter) side, and a shorter wall can't be part of a larger container with anything to its inside.</li>
        <li><strong>Ties?</strong> When heights are equal, moving either pointer is safe.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Area is bounded by the shorter wall → always move it.</li><li>Greedy two pointers turns O(n²) pair search into O(n).</li></ul>`
  }

});

/* ════════════════════ ARRAYS · SUBARRAY / SLIDING WINDOW ════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "53": {
    id: "LC #53", title: "Maximum Subarray", difficulty: "Medium", topic: "Arrays · Kadane's Algorithm",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Kadane's algorithm</span>
        <span class="ans-chip">DP</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the contiguous subarray with the largest sum and return that sum. The classic O(n) solution is <strong>Kadane's algorithm</strong>, a 1D dynamic-programming idea.</p>

      <h3>The Kadane Insight</h3>
      <p>At each index decide: extend the previous subarray, or start fresh here. You start fresh whenever the running sum has gone negative — a negative prefix can only hurt future sums.</p>
      <p>Recurrence: <code>cur = max(nums[i], cur + nums[i])</code>; answer = <code>max(cur)</code> over all i.</p>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Brute (all subarrays)</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Kadane</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td>Divide &amp; conquer</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(log n)</span></td></tr>
      </tbody></table>

      <h3>Java Code (Optimal — Kadane)</h3>
      <pre class="code-block">public int maxSubArray(int[] nums) {
    int cur = nums[0];        <span class="cc">// best sum ending at i</span>
    int best = nums[0];       <span class="cc">// global best</span>
    for (int i = 1; i &lt; nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]); <span class="cc">// extend or restart</span>
        best = Math.max(best, cur);
    }
    return best;
}</pre>
      <p><strong>To return the subarray</strong> too: track start/end indices — set a tentative start when you restart (<code>nums[i] &gt; cur + nums[i]</code>) and commit start/end whenever <code>cur</code> beats <code>best</code>.</p>

      <h3>Dry Run</h3>
      <p><code>[-2,1,-3,4,-1,2,1,-5,4]</code>: cur evolves -2,1,-2,4,3,5,6,1,5; best peaks at <strong>6</strong> (subarray <code>[4,-1,2,1]</code>) ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Initializing <code>best = 0</code>. If all numbers are negative (e.g. <code>[-3,-1,-2]</code>), the answer is <code>-1</code>, not 0. Initialize both vars to <code>nums[0]</code>.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>Frame Kadane as DP: <code>dp[i]</code> = max subarray sum ending at i. This connects it to a huge family of problems and impresses interviewers.</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Maximum Product Subarray (LC 152)?</strong> Track both max and min running products (a negative flips them).</li>
        <li><strong>Circular version (LC 918)?</strong> answer = max(normal Kadane, totalSum − minSubarray), with an all-negative guard.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Restart the running sum whenever it turns negative.</li><li>Seed with <code>nums[0]</code> to handle all-negative arrays.</li></ul>`
  },

  "121": {
    id: "LC #121", title: "Best Time to Buy and Sell Stock", difficulty: "Easy", topic: "Arrays · Greedy / Kadane",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Greedy</span>
        <span class="ans-chip">Running min</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Buy on one day and sell on a <strong>later</strong> day to maximize profit. One transaction only. Return the max profit, or 0 if no profit is possible.</p>

      <h3>How It Works</h3>
      <p>Scan left to right tracking the <strong>minimum price so far</strong> (the best day to have bought). At each day, the best profit if selling today is <code>price − minSoFar</code>. Keep the maximum.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int maxProfit(int[] prices) {
    int minPrice = Integer.MAX_VALUE;
    int best = 0;
    for (int p : prices) {
        if (p &lt; minPrice) minPrice = p;        <span class="cc">// best buy so far</span>
        else best = Math.max(best, p - minPrice); <span class="cc">// sell today</span>
    }
    return best;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Brute (all pairs)</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Running min</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[7,1,5,3,6,4]</code>: min→7,1,1,1,1,1; profit candidates 0,0,4,2,5,3 → best <strong>5</strong> (buy 1, sell 6) ✓. <code>[7,6,4,3,1]</code> → 0 (no profit).</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Kadane connection</span>This equals Kadane on the daily price differences. Recognizing that link is a strong signal in interviews.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Strictly decreasing prices → 0. Single day → 0. You cannot sell before you buy — the left-to-right scan enforces this naturally.</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Multiple transactions (LC 122)?</strong> Greedily add every positive day-to-day gain.</li>
        <li><strong>At most k transactions (LC 188)?</strong> 2D DP over (day, transactions).</li>
        <li><strong>With cooldown / fee?</strong> State-machine DP (hold / sold / rest).</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Track min price so far; profit = price − minSoFar.</li><li>It's Kadane in disguise on price deltas.</li></ul>`
  },

  "643": {
    id: "LC #643", title: "Maximum Average Subarray I", difficulty: "Easy", topic: "Arrays · Fixed Sliding Window",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Fixed sliding window</span>
        <span class="ans-chip">Running sum</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the contiguous subarray of <strong>fixed length k</strong> with the maximum average. Maximizing the average of a fixed-size window is the same as maximizing its <strong>sum</strong>, so we track sums and divide once at the end.</p>

      <h3>How It Works (fixed-size window)</h3>
      <p>Compute the sum of the first <code>k</code> elements. Then slide: add the entering element, subtract the leaving element — O(1) per step instead of re-summing.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public double findMaxAverage(int[] nums, int k) {
    double sum = 0;
    for (int i = 0; i &lt; k; i++) sum += nums[i]; <span class="cc">// first window</span>
    double best = sum;
    for (int i = k; i &lt; nums.length; i++) {
        sum += nums[i] - nums[i - k];           <span class="cc">// slide window by one</span>
        best = Math.max(best, sum);
    }
    return best / k;                            <span class="cc">// divide once</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>nums=[1,12,-5,-6,50,3], k=4</code>: first sum=1+12-5-6=2; slide → 2-1+50=... step by step best sum=51 (window [-5,-6,50,3]... actually [12,-5,-6,50]=51) → avg <strong>12.75</strong> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Use <code>double</code> (or <code>long</code> sum) to avoid overflow/precision loss. <code>k == n</code> → the whole array. Negatives are fine; don't reset the sum.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Pattern note</span>This is the <em>fixed</em>-size sliding window. Compare with <em>variable</em>-size windows (LC 209, 1004) where the window grows/shrinks based on a condition.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Max average of fixed k ⇔ max sum of fixed k.</li><li>Slide in O(1): add entering, subtract leaving.</li></ul>`
  },

  "1004": {
    id: "LC #1004", title: "Max Consecutive Ones III", difficulty: "Medium", topic: "Arrays · Variable Sliding Window",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Variable sliding window</span>
        <span class="ans-chip">At most k</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Given a binary array and an integer <code>k</code>, find the longest subarray of 1s you can make by flipping at most <code>k</code> zeros. This is the canonical <strong>"longest window with at most k of something"</strong> template.</p>

      <h3>How It Works (variable window)</h3>
      <p>Expand <code>right</code>, counting zeros inside the window. When zeros exceed <code>k</code>, shrink from <code>left</code> until the window is valid again. The answer is the largest valid window width seen.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int longestOnes(int[] nums, int k) {
    int left = 0, zeros = 0, best = 0;
    for (int right = 0; right &lt; nums.length; right++) {
        if (nums[right] == 0) zeros++;          <span class="cc">// include new element</span>
        while (zeros &gt; k) {                      <span class="cc">// too many flips -> shrink</span>
            if (nums[left] == 0) zeros--;
            left++;
        }
        best = Math.max(best, right - left + 1); <span class="cc">// valid window width</span>
    }
    return best;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span> — each index enters/leaves the window once</td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>nums=[1,1,1,0,0,0,1,1,1,1,0], k=2</code>: window grows to include two zeros; when a third zero enters, left advances past earlier zeros. Max valid window length = <strong>6</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Template</span>"Longest subarray with at most k X" → expand right, shrink left while count(X) &gt; k, track max width. Memorize this; it covers many medium problems.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Shrinking with an <code>if</code> instead of <code>while</code> when the condition is "at most k". (A neat trick: for this specific problem, a non-shrinking window of constant-or-growing size also works, but the while-loop template is the safe general pattern.)</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Longest substring with at most k distinct chars (LC 340)?</strong> Same template, use a frequency map as the "count".</li>
        <li><strong>Why O(n) not O(n²)?</strong> left and right each move forward at most n times total — amortized linear.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>"At most k" → variable window: grow right, shrink left on violation.</li><li>Both pointers move forward only → O(n).</li></ul>`
  },

  "209": {
    id: "LC #209", title: "Minimum Size Subarray Sum", difficulty: "Medium", topic: "Arrays · Variable Sliding Window",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Variable sliding window</span>
        <span class="ans-chip">Shrink for minimum</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Given positive integers and a target, find the <strong>minimal length</strong> of a contiguous subarray whose sum is <code>≥ target</code>. Return 0 if none exists. This is the "minimum window" flavor of sliding window (works because all values are positive → sum is monotonic as the window grows).</p>

      <h3>How It Works</h3>
      <p>Expand <code>right</code>, adding to a running sum. Whenever the sum is <code>≥ target</code>, try to <strong>shrink</strong> from the left to find the smallest qualifying window, updating the best length each time.</p>

      <h3>Java Code (Optimal — O(n))</h3>
      <pre class="code-block">public int minSubArrayLen(int target, int[] nums) {
    int left = 0, sum = 0, best = Integer.MAX_VALUE;
    for (int right = 0; right &lt; nums.length; right++) {
        sum += nums[right];
        while (sum &gt;= target) {                       <span class="cc">// shrink while still valid</span>
            best = Math.min(best, right - left + 1);
            sum -= nums[left++];
        }
    }
    return best == Integer.MAX_VALUE ? 0 : best;
}</pre>

      <h4>Follow-up: O(n log n) with prefix sums + binary search</h4>
      <pre class="code-block"><span class="cc">// Build prefix sums, then for each start binary-search the</span>
      <span class="cc">// smallest end with pre[end] - pre[start] &gt;= target.</span>
      <span class="cc">// Useful talking point if asked for alternatives; sliding window is preferred.</span></pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Brute (all subarrays)</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Sliding window</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td>Prefix + binary search</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>target=7, nums=[2,3,1,2,4,3]</code>: window grows to [2,3,1,2]=8≥7 (len4), shrink to [3,1,2,4]... eventually [4,3]=7 (len2). Best = <strong>2</strong> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Positive values required</span>The shrink logic assumes adding elements only increases the sum. With negatives, use prefix sums + a monotonic deque (LC 862) instead.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Returning <code>best</code> without the sentinel check — if no window qualifies, you must return 0, not <code>Integer.MAX_VALUE</code>.</div>

      <h3>Key Takeaways</h3>
      <ul><li>"Minimum window ≥ target" → grow right, shrink left while valid.</li><li>Monotonicity from positive values is what makes the window valid.</li></ul>`
  }

});

/* ════════════════════════ ARRAYS · HASHING ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "1": {
    id: "LC #1", title: "Two Sum", difficulty: "Easy", topic: "Arrays · HashMap",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">HashMap</span>
        <span class="ans-chip">Complement lookup</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return the indices of the two numbers that add up to <code>target</code>. Exactly one solution exists; you may not reuse the same element. The optimal approach trades space for time using a <strong>HashMap of value → index</strong>.</p>

      <h3>Key Insight</h3>
      <p>For each number <code>x</code>, its partner is <code>target − x</code> (the complement). If we have already seen the complement, we have our pair. A hash map gives O(1) average lookup, so one pass suffices.</p>

      <h3>Approaches Compared</h3>
      <table>
        <thead><tr><th>Approach</th><th>Time</th><th>Space</th><th>Note</th></tr></thead>
        <tbody>
          <tr><td>Brute (two loops)</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)</span></td><td>Check every pair</td></tr>
          <tr><td>Sort + two pointers</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(n)</span></td><td>Loses original indices</td></tr>
          <tr><td><strong>HashMap (one pass)</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td><td>Optimal</td></tr>
        </tbody>
      </table>

      <h3>Java Code (Optimal — one pass)</h3>
      <pre class="code-block">public int[] twoSum(int[] nums, int target) {
    Map&lt;Integer, Integer&gt; seen = new HashMap&lt;&gt;(); <span class="cc">// value -> index</span>
    for (int i = 0; i &lt; nums.length; i++) {
        int need = target - nums[i];                <span class="cc">// complement</span>
        if (seen.containsKey(need)) {
            return new int[]{ seen.get(need), i };  <span class="cc">// found pair</span>
        }
        seen.put(nums[i], i);                       <span class="cc">// record current</span>
    }
    return new int[]{ -1, -1 };                     <span class="cc">// guaranteed unreachable</span>
}</pre>
      <p>Checking the complement <em>before</em> inserting the current element prevents using the same index twice.</p>

      <h3>Dry Run</h3>
      <p><code>nums=[2,7,11,15], target=9</code>: i=0 need=7, not seen, put{2:0}. i=1 need=2, seen at 0 → return <code>[0,1]</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Inserting before checking → may match an element with itself. (2) Assuming the array is sorted (it is not — that is LC 167). (3) Returning values instead of indices.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>State the brute force, then "I can trade space for time with a hash map." Mention average vs worst-case O(n) for hashing (adversarial collisions).</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Multiple answers / all pairs?</strong> Don't return early; store results, handle duplicates.</li>
        <li><strong>Sorted input?</strong> Two pointers → O(1) extra space (LC 167).</li>
        <li><strong>3Sum / 4Sum?</strong> Reduce to Two Sum inside an outer loop.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Hash the complement; check before inserting.</li><li>One pass, O(n) time, O(n) space — the template for many lookup problems.</li></ul>`
  },

  "217": {
    id: "LC #217", title: "Contains Duplicate", difficulty: "Easy", topic: "Arrays · HashSet",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">HashSet</span>
        <span class="ans-chip">Membership</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return <code>true</code> if any value appears at least twice. The textbook use of a <strong>HashSet</strong> for O(1) membership testing.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public boolean containsDuplicate(int[] nums) {
    Set&lt;Integer&gt; seen = new HashSet&lt;&gt;();
    for (int x : nums) {
        if (!seen.add(x)) return true; <span class="cc">// add() returns false if already present</span>
    }
    return false;
}</pre>
      <p><code>seen.add(x)</code> returns <code>false</code> when <code>x</code> already exists — a clean one-liner that combines check + insert.</p>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Brute (all pairs)</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td>Sort then scan</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(1)*</span></td></tr>
        <tr><td><strong>HashSet</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
      </tbody></table>
      <p>*If sorting in place is allowed.</p>

      <h3>Dry Run</h3>
      <p><code>[1,2,3,1]</code>: add 1,2,3 ok; add 1 again → false → return <code>true</code> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Trade-off note</span>If you cannot use extra space, sort first (O(n log n), O(1)) and check adjacent equals. The HashSet trades space for speed.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Follow-ups</span>LC 219 "duplicate within distance k" → store last index in a map; LC 220 "value &amp; index window" → TreeSet / buckets.</div>

      <h3>Key Takeaways</h3>
      <ul><li><code>set.add(x) == false</code> means a duplicate.</li><li>Pick HashSet (fast) vs sort (no extra space) based on constraints.</li></ul>`
  },

  "41": {
    id: "LC #41", title: "First Missing Positive", difficulty: "Hard", topic: "Arrays · Index Marking",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Cyclic sort / index marking</span>
        <span class="ans-chip">O(1) space</span>
        <span class="ans-chip">Array-as-hashtable</span>
      </div>

      <h3>Overview</h3>
      <p>Find the smallest missing <strong>positive</strong> integer in O(n) time and <strong>O(1) extra space</strong>. The trick: use the array itself as a hash table, since the answer must lie in <code>[1 .. n+1]</code>.</p>

      <h3>Key Insight</h3>
      <p>For an array of length <code>n</code>, the first missing positive is somewhere in <code>1..n+1</code>. We place each value <code>v</code> (where <code>1 ≤ v ≤ n</code>) at index <code>v-1</code> via swaps (cyclic sort). Then the first index <code>i</code> where <code>nums[i] != i+1</code> reveals the missing value <code>i+1</code>.</p>

      <h3>Java Code (Optimal — cyclic sort)</h3>
      <pre class="code-block">public int firstMissingPositive(int[] nums) {
    int n = nums.length;
    for (int i = 0; i &lt; n; i++) {
        <span class="cc">// place nums[i] at its correct index (value v -&gt; index v-1)</span>
        while (nums[i] &gt; 0 &amp;&amp; nums[i] &lt;= n
               &amp;&amp; nums[nums[i] - 1] != nums[i]) {
            int correct = nums[i] - 1;
            int tmp = nums[correct];
            nums[correct] = nums[i];
            nums[i] = tmp;                      <span class="cc">// swap into place</span>
        }
    }
    for (int i = 0; i &lt; n; i++) {
        if (nums[i] != i + 1) return i + 1;     <span class="cc">// first gap</span>
    }
    return n + 1;                               <span class="cc">// 1..n all present</span>
}</pre>
      <p>The <code>!=</code> guard in the while prevents infinite loops on duplicates. Each value is moved at most once, so the nested loop is still O(n) total.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>HashSet</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td><strong>Cyclic sort (in place)</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[3,4,-1,1]</code> → after placing: <code>[1,-1,3,4]</code>. Scan: index1 holds -1 ≠ 2 → missing = <strong>2</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Omitting the <code>nums[nums[i]-1] != nums[i]</code> check → infinite swap on duplicates. (2) Forgetting the final <code>n+1</code> when <code>1..n</code> are all present. (3) Off-by-one between value <code>v</code> and index <code>v-1</code>.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>If O(1) space isn't required, lead with the HashSet solution for clarity, then offer cyclic sort as the optimal follow-up. The "array as hash table" idea is the key talking point.</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Why range 1..n+1?</strong> With n slots, at best you hold 1..n; if all present, the answer is n+1.</li>
        <li><strong>Alternative marking?</strong> Negate <code>nums[v-1]</code> as a "seen" flag (needs values cleaned to positive first).</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Answer ∈ [1, n+1]; use the array as an index-addressed hash table.</li><li>Cyclic sort gives O(n) time and O(1) space.</li></ul>`
  },

  "238": {
    id: "LC #238", title: "Product of Array Except Self", difficulty: "Medium", topic: "Arrays · Prefix Product",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Prefix / suffix product</span>
        <span class="ans-chip">No division</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return an array where <code>ans[i]</code> is the product of all elements except <code>nums[i]</code>, in O(n) and <strong>without using division</strong> (and ideally O(1) extra space besides the output).</p>

      <h3>Key Insight</h3>
      <p><code>ans[i] = (product of everything to the left of i) × (product of everything to the right of i)</code>. Compute left products in one forward pass, then multiply by right products in a backward pass — reusing the output array.</p>

      <h3>Java Code (Optimal — O(1) extra space)</h3>
      <pre class="code-block">public int[] productExceptSelf(int[] nums) {
    int n = nums.length;
    int[] ans = new int[n];
    ans[0] = 1;
    for (int i = 1; i &lt; n; i++) {
        ans[i] = ans[i - 1] * nums[i - 1];  <span class="cc">// prefix product up to i-1</span>
    }
    int right = 1;
    for (int i = n - 1; i &gt;= 0; i--) {
        ans[i] *= right;                    <span class="cc">// multiply suffix product</span>
        right *= nums[i];                   <span class="cc">// extend suffix</span>
    }
    return ans;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th><th>Note</th></tr></thead>
      <tbody>
        <tr><td>Division (total / nums[i])</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td><td>Breaks on zeros; disallowed</td></tr>
        <tr><td>Two arrays (L &amp; R)</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td><td>Easy to derive</td></tr>
        <tr><td><strong>Prefix in output + running suffix</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td><td>Optimal</td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,3,4]</code>: prefixes → [1,1,2,6]; suffix pass: i=3 ans=6×1=6,right=4; i=2 ans=2×4=8,right=12; i=1 ans=1×12=12,right=24; i=0 ans=1×24=24. Result <code>[24,12,8,6]</code> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Why not division?</span>A single zero makes every other product 0/x undefined; two zeros make all results 0. The prefix/suffix method handles zeros naturally.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>The output array doesn't count as "extra" space by convention, so this counts as O(1) extra. Mention overflow → use <code>long</code> if products can exceed int.</div>

      <h3>Key Takeaways</h3>
      <ul><li>ans[i] = leftProduct × rightProduct.</li><li>Store prefixes in the output, fold suffixes in with a single running variable.</li></ul>`
  },

  "383": {
    id: "LC #383", title: "Ransom Note", difficulty: "Easy", topic: "Arrays · Frequency Map",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Frequency count</span>
        <span class="ans-chip">Char array</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Can <code>ransomNote</code> be built from the letters in <code>magazine</code> (each magazine letter used once)? Count letter frequencies in the magazine, then decrement for each note letter.</p>

      <h3>Java Code (Optimal — 26-element count array)</h3>
      <pre class="code-block">public boolean canConstruct(String ransomNote, String magazine) {
    int[] count = new int[26];                  <span class="cc">// lowercase letters only</span>
    for (char c : magazine.toCharArray()) count[c - 'a']++;
    for (char c : ransomNote.toCharArray()) {
        if (--count[c - 'a'] &lt; 0) return false; <span class="cc">// not enough of this letter</span>
    }
    return true;
}</pre>
      <p>A fixed 26-int array is faster and lighter than a <code>HashMap&lt;Character,Integer&gt;</code> when the alphabet is small and known.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(m + n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> (fixed 26)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>note="aa", magazine="aab"</code>: counts a:2,b:1. Note: a→1, a→0 ⇒ never negative → <code>true</code>. <code>note="aa", magazine="ab"</code>: second a → -1 → <code>false</code> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">When to use HashMap instead</span>If the input is Unicode or the alphabet is large/unknown, use a <code>Map</code>. For known lowercase ASCII, the array is the cleaner answer.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Empty note → always true. Note longer than magazine → necessarily false (the decrement catches it).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Count then decrement; a negative count means insufficient letters.</li><li>Fixed-size int arrays beat HashMaps for small known alphabets.</li></ul>`
  },

  "560": {
    id: "LC #560", title: "Subarray Sum Equals K", difficulty: "Medium", topic: "Arrays · Prefix Sum + HashMap",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Prefix sum</span>
        <span class="ans-chip">HashMap of counts</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Count the number of contiguous subarrays whose sum equals <code>k</code>. Values may be negative, so sliding window does <strong>not</strong> apply. The trick is <strong>prefix sums + a hash map of prefix-sum frequencies</strong>.</p>

      <h3>Key Insight</h3>
      <p>Let <code>pre[j]</code> be the sum of the first <code>j</code> elements. A subarray <code>(i, j]</code> sums to <code>k</code> iff <code>pre[j] − pre[i] = k</code>, i.e. <code>pre[i] = pre[j] − k</code>. So at each <code>j</code>, count how many earlier prefix sums equal <code>pre[j] − k</code>.</p>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Brute (all subarrays)</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Prefix sum + HashMap</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
      </tbody></table>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int subarraySum(int[] nums, int k) {
    Map&lt;Integer, Integer&gt; freq = new HashMap&lt;&gt;();
    freq.put(0, 1);                  <span class="cc">// empty prefix sum seen once</span>
    int prefix = 0, count = 0;
    for (int x : nums) {
        prefix += x;
        count += freq.getOrDefault(prefix - k, 0); <span class="cc">// subarrays ending here</span>
        freq.merge(prefix, 1, Integer::sum);       <span class="cc">// record this prefix</span>
    }
    return count;
}</pre>
      <p>Seeding <code>freq.put(0, 1)</code> accounts for subarrays that start at index 0 (whole-prefix equals k).</p>

      <h3>Dry Run</h3>
      <p><code>nums=[1,1,1], k=2</code>: prefix 1 (need -1, 0 found) ; prefix 2 (need 0 → 1 found, count=1); prefix 3 (need 1 → 1 found, count=2). Answer <strong>2</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Forgetting <code>freq.put(0,1)</code> → misses subarrays starting at index 0. (2) Trying sliding window — invalid with negatives. (3) Updating the map before counting → can double-count when k=0.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Pattern</span>"Count/length of subarrays with sum/condition X" + negatives → prefix sum stored in a HashMap. Hugely reusable (LC 974, 525, 523).</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Longest subarray with sum k (LC 325)?</strong> Store the <em>first</em> index of each prefix sum, maximize length.</li>
        <li><strong>Binary array, equal 0s and 1s (LC 525)?</strong> Map 0→−1, find longest zero-sum subarray.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Subarray sum = k ⇔ pre[j] − pre[i] = k; look up pre[j] − k.</li><li>Seed the map with {0:1}; count before inserting.</li></ul>`
  },

  "169": {
    id: "LC #169", title: "Majority Element", difficulty: "Easy", topic: "Arrays · Boyer-Moore Voting",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Boyer-Moore voting</span>
        <span class="ans-chip">O(1) space</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>An element appears more than <code>n/2</code> times — return it. Boyer-Moore voting finds it in O(n) time and O(1) space, beating the HashMap counting approach on space.</p>

      <h3>How Boyer-Moore Works</h3>
      <p>Keep a <code>candidate</code> and a <code>count</code>. Matching elements increment the count; differing elements decrement it. When count hits 0, adopt the current element as the new candidate. Because the majority element occurs &gt; n/2 times, it survives all the cancellations.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int majorityElement(int[] nums) {
    int candidate = nums[0], count = 0;
    for (int x : nums) {
        if (count == 0) candidate = x;        <span class="cc">// adopt new candidate</span>
        count += (x == candidate) ? 1 : -1;   <span class="cc">// vote / cancel</span>
    }
    return candidate;                          <span class="cc">// guaranteed majority exists</span>
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>HashMap counting</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td>Sort, take middle</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Boyer-Moore</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[2,2,1,1,1,2,2]</code>: cand=2(c1),2(c2),1(c1),1(c0)→next cand,1(c1)... ends cand=<strong>2</strong> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">When majority isn't guaranteed</span>If the problem doesn't guarantee a majority exists, add a verification pass to confirm the candidate truly exceeds n/2.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Follow-up (LC 229)</span>Elements appearing &gt; n/3: there can be at most two — run Boyer-Moore with two candidates and two counters, then verify both.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Cancel pairs of different elements; the majority survives.</li><li>O(1) space — verify the candidate if existence isn't guaranteed.</li></ul>`
  },

  "128": {
    id: "LC #128", title: "Longest Consecutive Sequence", difficulty: "Medium", topic: "Arrays · HashSet",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">HashSet</span>
        <span class="ans-chip">Sequence starts</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the length of the longest run of consecutive integers (e.g. 1,2,3,4) in an unsorted array — in <strong>O(n)</strong>. Sorting would be O(n log n); the hash-set technique hits linear time.</p>

      <h3>Key Insight</h3>
      <p>Put all numbers in a HashSet. Only start counting a sequence from a number that is a <strong>sequence start</strong> — i.e. <code>x-1</code> is not in the set. From each start, walk <code>x, x+1, x+2, ...</code> while present. Each number is visited at most twice, giving O(n) overall.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int longestConsecutive(int[] nums) {
    Set&lt;Integer&gt; set = new HashSet&lt;&gt;();
    for (int x : nums) set.add(x);
    int best = 0;
    for (int x : set) {
        if (set.contains(x - 1)) continue;   <span class="cc">// not a sequence start</span>
        int cur = x, len = 1;
        while (set.contains(cur + 1)) {       <span class="cc">// walk the run</span>
            cur++; len++;
        }
        best = Math.max(best, len);
    }
    return best;
}</pre>

      <h3>Why It's O(n), Not O(n²)</h3>
      <p>The inner while only runs for sequence <em>starts</em>. Each element is the "next" in exactly one run, so the total work across all while-loops is O(n). The <code>x-1</code> guard is what prevents re-walking the same run.</p>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Sort + scan</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>HashSet starts</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[100,4,200,1,3,2]</code> → set {100,4,200,1,3,2}. Starts: 100 (len1), 200 (len1), 1 (no 0 → walk 1,2,3,4 → len <strong>4</strong>). Answer 4 ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Omitting the <code>x-1</code> start check → O(n²) by re-walking runs. (2) Forgetting to dedup (the set does this). (3) Initializing best to 1 — fails on an empty array (return 0).</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Empty array → 0. Duplicates collapse in the set. Negative numbers work fine.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Only extend from sequence starts (<code>x-1</code> absent) for amortized O(n).</li><li>HashSet trades space to beat the sorting bound.</li></ul>`
  }

});

/* ════════════════════════ ARRAYS · ROTATION / SORTING ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "189": {
    id: "LC #189", title: "Rotate Array", difficulty: "Medium", topic: "Arrays · Triple Reverse",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Triple reverse</span>
        <span class="ans-chip">In-place</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Rotate the array to the right by <code>k</code> steps, in place. The elegant O(1)-space trick is the <strong>triple reverse</strong>: reverse the whole array, then reverse the first <code>k</code>, then reverse the rest.</p>

      <h3>Why Triple Reverse Works</h3>
      <p>A right rotation by <code>k</code> moves the last <code>k</code> elements to the front. Reversing the whole array brings those last <code>k</code> to the front (but reversed); reversing each of the two segments restores their internal order.</p>

      <h3>Java Code (Optimal — triple reverse)</h3>
      <pre class="code-block">public void rotate(int[] nums, int k) {
    int n = nums.length;
    k %= n;                       <span class="cc">// k can exceed n</span>
    reverse(nums, 0, n - 1);      <span class="cc">// whole array</span>
    reverse(nums, 0, k - 1);      <span class="cc">// first k</span>
    reverse(nums, k, n - 1);      <span class="cc">// remaining</span>
}
private void reverse(int[] a, int i, int j) {
    while (i &lt; j) {
        int t = a[i]; a[i] = a[j]; a[j] = t;
        i++; j--;
    }
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Extra array (copy shifted)</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td>Rotate one-by-one k times</td><td><span class="ans-cx">O(n·k)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Triple reverse</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td>Cyclic replacements</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,3,4,5,6,7], k=3</code>: reverse all → [7,6,5,4,3,2,1]; reverse first 3 → [5,6,7,4,3,2,1]; reverse rest → <code>[5,6,7,1,2,3,4]</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Skipping <code>k %= n</code>. If <code>k &gt; n</code> (e.g. k=10, n=7), the raw reverses go out of bounds or rotate incorrectly. Always normalize first.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Left rotation?</span>Rotating left by k = rotating right by <code>n - k</code>. Same triple-reverse machinery.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Triple reverse rotates in place in O(n)/O(1).</li><li>Normalize <code>k %= n</code> before doing anything.</li></ul>`
  },

  "75": {
    id: "LC #75", title: "Sort Colors", difficulty: "Medium", topic: "Arrays · Dutch National Flag",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Dutch National Flag</span>
        <span class="ans-chip">Three pointers</span>
        <span class="ans-chip">One pass</span>
      </div>

      <h3>Overview</h3>
      <p>Sort an array of 0s, 1s, and 2s in place, in a <strong>single pass</strong>. This is Dijkstra's <strong>Dutch National Flag</strong> algorithm — three pointers partition the array into three regions.</p>

      <h3>How It Works</h3>
      <p>Maintain three pointers: <code>low</code> (boundary of 0s), <code>mid</code> (current element), <code>high</code> (boundary of 2s).</p>
      <ul>
        <li><code>nums[mid] == 0</code> → swap with <code>low</code>, advance both.</li>
        <li><code>nums[mid] == 1</code> → leave it, advance <code>mid</code>.</li>
        <li><code>nums[mid] == 2</code> → swap with <code>high</code>, shrink <code>high</code> (do <strong>not</strong> advance mid — the swapped-in value is unexamined).</li>
      </ul>

      <h3>Java Code (Optimal — one pass)</h3>
      <pre class="code-block">public void sortColors(int[] nums) {
    int low = 0, mid = 0, high = nums.length - 1;
    while (mid &lt;= high) {
        switch (nums[mid]) {
            case 0 -&gt; swap(nums, low++, mid++); <span class="cc">// 0 -&gt; front region</span>
            case 1 -&gt; mid++;                    <span class="cc">// 1 -&gt; stays</span>
            case 2 -&gt; swap(nums, mid, high--);  <span class="cc">// 2 -&gt; back region (recheck mid)</span>
        }
    }
}
private void swap(int[] a, int i, int j) {
    int t = a[i]; a[i] = a[j]; a[j] = t;
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th><th>Passes</th></tr></thead>
      <tbody>
        <tr><td>Counting sort</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td><td>Two</td></tr>
        <tr><td><strong>Dutch National Flag</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td><td>One</td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[2,0,2,1,1,0]</code>: mid=0 val2→swap high → [0,0,2,1,1,2],high=4; val0→swap low → low,mid=1; val0→swap → [0,0,...],low,mid=2; val2→swap high=3 → [0,0,1,1,2,2]... → sorted <code>[0,0,1,1,2,2]</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Critical detail</span>On a <code>2</code> swap, do <strong>not</strong> advance <code>mid</code> — the element pulled in from <code>high</code> hasn't been classified yet. Advancing here is the most common bug.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>The two-pass counting sort is perfectly acceptable and easier to get right; mention DNF as the one-pass optimal. Generalizes to partitioning around a pivot (quicksort's 3-way partition).</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Why not just Arrays.sort?</strong> O(n log n) vs O(n); the bounded value set (0/1/2) enables linear time.</li>
        <li><strong>k colors?</strong> Counting sort generalizes cleanly; DNF is specific to 3 partitions.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Three pointers partition 0/1/2 in one pass.</li><li>Don't advance mid after a 2-swap — recheck the new value.</li></ul>`
  }

});

/* ════════════════════════ STRINGS · GENERAL ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "13": {
    id: "LC #13", title: "Roman to Integer", difficulty: "Easy", topic: "Strings · Parsing",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">String parsing</span>
        <span class="ans-chip">Subtraction rule</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Convert a Roman numeral to an integer. Symbols normally add up left to right, but when a smaller value precedes a larger one (e.g. <code>IV</code> = 4, <code>IX</code> = 9) it is <strong>subtracted</strong>. The trick is detecting those subtractive pairs cleanly.</p>

      <h3>Key Insight</h3>
      <p>Scan left to right. If the current symbol's value is <strong>less than the next</strong> symbol's value, subtract it; otherwise add it. This single rule captures all six subtractive combinations (IV, IX, XL, XC, CD, CM).</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int romanToInt(String s) {
    Map&lt;Character, Integer&gt; val = Map.of(
        'I',1,'V',5,'X',10,'L',50,'C',100,'D',500,'M',1000);
    int total = 0;
    for (int i = 0; i &lt; s.length(); i++) {
        int cur = val.get(s.charAt(i));
        if (i + 1 &lt; s.length() &amp;&amp; cur &lt; val.get(s.charAt(i + 1))) {
            total -= cur;     <span class="cc">// subtractive case (e.g. IV, IX)</span>
        } else {
            total += cur;     <span class="cc">// normal additive case</span>
        }
    }
    return total;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> (fixed 7-symbol map)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>"MCMXCIV"</code> = 1994: M(1000 add) + C(100&lt;1000 sub −100) + M(1000 add) + X(10&lt;100 sub −10) + C(100 add) + I(1&lt;5 sub −1) + V(5 add) = 1000−100+1000−10+100−1+5 = <strong>1994</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Hardcoding only some subtractive pairs, or comparing to the <em>previous</em> symbol and double-counting. The "compare to next" rule is the cleanest and complete.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>The reverse (Integer → Roman, LC 12) is a greedy problem: map value→symbol in descending order and subtract while possible.</div>

      <h3>Key Takeaways</h3>
      <ul><li>If <code>val[i] &lt; val[i+1]</code>, subtract; else add.</li><li>One rule covers all subtractive combinations.</li></ul>`
  },

  "14": {
    id: "LC #14", title: "Longest Common Prefix", difficulty: "Easy", topic: "Strings · Prefix",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Vertical scan</span>
        <span class="ans-chip">Prefix</span>
        <span class="ans-chip">Time O(S)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the longest common prefix shared by all strings in an array; return <code>""</code> if none. The simplest robust approach is <strong>vertical scanning</strong> — compare character columns across all strings.</p>

      <h3>How It Works (vertical scan)</h3>
      <p>Take the first string as a reference. For each character position <code>i</code>, check that every other string has the same character at <code>i</code>. Stop at the first mismatch or when any string ends.</p>

      <h3>Java Code (Optimal — vertical scan)</h3>
      <pre class="code-block">public String longestCommonPrefix(String[] strs) {
    if (strs.length == 0) return "";
    for (int i = 0; i &lt; strs[0].length(); i++) {
        char c = strs[0].charAt(i);
        for (int j = 1; j &lt; strs.length; j++) {
            if (i == strs[j].length() || strs[j].charAt(i) != c) {
                return strs[0].substring(0, i); <span class="cc">// mismatch or end reached</span>
            }
        }
    }
    return strs[0];   <span class="cc">// first string is a prefix of all</span>
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th><th>Note</th></tr></thead>
      <tbody>
        <tr><td>Vertical scan</td><td><span class="ans-cx">O(S)</span></td><td><span class="ans-cx">O(1)</span></td><td>S = total chars; early exit</td></tr>
        <tr><td>Horizontal (shrink prefix)</td><td><span class="ans-cx">O(S)</span></td><td><span class="ans-cx">O(1)</span></td><td>prefix vs each string</td></tr>
        <tr><td>Sort + compare first/last</td><td><span class="ans-cx">O(n·m·log n)</span></td><td><span class="ans-cx">O(1)</span></td><td>Only ends matter after sort</td></tr>
        <tr><td>Trie</td><td><span class="ans-cx">O(S)</span></td><td><span class="ans-cx">O(S)</span></td><td>Overkill here</td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>["flower","flow","flight"]</code>: col0 f=f=f, col1 l=l=l, col2 o≠i → return <code>"fl"</code> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Empty array → <code>""</code>. An empty string in the array → <code>""</code>. Single string → itself. The <code>i == strs[j].length()</code> check handles a shorter string ending first.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Vertical scan exits early at the first differing column.</li><li>Sort trick: after sorting, only the first and last strings need comparing.</li></ul>`
  },

  "271": {
    id: "LC #271", title: "Encode and Decode Strings", difficulty: "Medium", topic: "Strings · Delimiter Encoding",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Length-prefix encoding</span>
        <span class="ans-chip">Serialization</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Design <code>encode(List&lt;String&gt;)</code> → one string, and <code>decode(String)</code> → the original list. The catch: strings may contain <strong>any</strong> character, so a naive delimiter (like a comma) can be ambiguous. The robust solution is <strong>length-prefixing</strong>.</p>

      <h3>Key Insight</h3>
      <p>Prefix each string with its length and a separator, e.g. <code>"5#hello5#world"</code>. During decode, read digits up to <code>#</code> to learn the length, then take exactly that many characters — content can contain <code>#</code> or digits without breaking parsing.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public String encode(List&lt;String&gt; strs) {
    StringBuilder sb = new StringBuilder();
    for (String s : strs) {
        sb.append(s.length()).append('#').append(s); <span class="cc">// len#content</span>
    }
    return sb.toString();
}

public List&lt;String&gt; decode(String s) {
    List&lt;String&gt; res = new ArrayList&lt;&gt;();
    int i = 0;
    while (i &lt; s.length()) {
        int j = i;
        while (s.charAt(j) != '#') j++;          <span class="cc">// read the length</span>
        int len = Integer.parseInt(s.substring(i, j));
        String word = s.substring(j + 1, j + 1 + len); <span class="cc">// exact slice</span>
        res.add(word);
        i = j + 1 + len;                         <span class="cc">// jump past this chunk</span>
    }
    return res;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time (encode/decode)</td><td><span class="ans-cx">O(n)</span> total chars</td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span> output</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>["lc","leet"]</code> → encode → <code>"2#lc4#leet"</code>. Decode: read "2" → next 2 chars "lc"; read "4" → next 4 "leet" → <code>["lc","leet"]</code> ✓. Even <code>["#3","a"]</code> encodes to <code>"2##31#a"</code> and decodes correctly.</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Using a plain delimiter (e.g. join by <code>","</code>). It fails whenever the data itself contains the delimiter. Length-prefixing is delimiter-agnostic and the expected answer.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>This is a serialization design question — discuss why escaping is fragile and length-prefix framing (the same idea TCP/Protobuf use) is robust.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Frame each string as <code>length#content</code> so content can be anything.</li><li>Decode by reading the length, then slicing exactly that many chars.</li></ul>`
  },

  "205": {
    id: "LC #205", title: "Isomorphic Strings", difficulty: "Easy", topic: "Strings · Bijection Map",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Two-way mapping</span>
        <span class="ans-chip">Bijection</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Two strings are isomorphic if characters of <code>s</code> can be replaced to get <code>t</code>, with a <strong>consistent one-to-one</strong> mapping (no two characters map to the same character). The key word is <strong>bijection</strong> — the mapping must work in both directions.</p>

      <h3>Key Insight</h3>
      <p>A single map (s→t) is not enough — it allows two different source chars to map to the same target. You need to enforce both <code>s[i]→t[i]</code> and <code>t[i]→s[i]</code> are consistent.</p>

      <h3>Java Code (Optimal — two index arrays)</h3>
      <pre class="code-block">public boolean isIsomorphic(String s, String t) {
    int[] mapS = new int[256], mapT = new int[256]; <span class="cc">// last-seen position +1</span>
    for (int i = 0; i &lt; s.length(); i++) {
        char a = s.charAt(i), b = t.charAt(i);
        if (mapS[a] != mapT[b]) return false;  <span class="cc">// inconsistent mapping</span>
        mapS[a] = i + 1;                        <span class="cc">// +1 so 0 means "unseen"</span>
        mapT[b] = i + 1;
    }
    return true;
}</pre>
      <p>Storing "last index seen + 1" lets one comparison verify both directions: if the two characters were last seen at different positions, the pairing is inconsistent.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> (256 fixed)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>"egg","add"</code>: e↔a, g↔d, g↔d consistent → true. <code>"foo","bar"</code>: o must map to both a and r → mapS['o'] vs mapT differ → <strong>false</strong> ✓. <code>"badc","baba"</code>: d and c both want to pair with a → false.</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Using only one HashMap (s→t). It accepts <code>"ab" → "aa"</code> wrongly. Always check the reverse direction too.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Related</span>Word Pattern (LC 290) is the same bijection idea between a pattern and words.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Isomorphic ⇒ bijection ⇒ verify mapping both ways.</li><li>"Last seen index" arrays verify both directions in one comparison.</li></ul>`
  },

  "344": {
    id: "LC #344", title: "Reverse String", difficulty: "Easy", topic: "Strings · Two Pointers",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Two pointers</span>
        <span class="ans-chip">In-place swap</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Reverse a <code>char[]</code> in place with O(1) extra space. The textbook two-pointer swap: exchange the ends and move inward.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public void reverseString(char[] s) {
    int l = 0, r = s.length - 1;
    while (l &lt; r) {
        char tmp = s[l]; s[l] = s[r]; s[r] = tmp; <span class="cc">// swap ends</span>
        l++; r--;
    }
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>['h','e','l','l','o']</code>: swap(0,4)→o...h, swap(1,3)→o,l,l,e,h; l==r at 2 stop → <code>['o','l','l','e','h']</code> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Empty or single-char array → no swaps. Odd length leaves the middle untouched (correct).</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>For a Java <code>String</code> (immutable), use <code>new StringBuilder(str).reverse().toString()</code>, but this problem hands you a mutable <code>char[]</code> specifically to test the in-place swap. The reverse subroutine also powers Rotate Array (LC 189) and Reverse Words.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Swap from both ends toward the middle, O(1) space.</li><li>This reverse subroutine is a reusable building block.</li></ul>`
  }

});

/* ════════════════════ STRINGS · SLIDING WINDOW ════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "3": {
    id: "LC #3", title: "Longest Substring Without Repeating Characters", difficulty: "Medium", topic: "Strings · Sliding Window",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Variable sliding window</span>
        <span class="ans-chip">Last-seen map</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the length of the longest substring with all distinct characters. The classic <strong>variable-size sliding window</strong>: grow the window on the right; when a duplicate appears, shrink from the left past the previous occurrence.</p>

      <h3>How It Works</h3>
      <p>Keep a map of each character's last index. As <code>right</code> advances, if the current char was seen <em>inside</em> the current window, jump <code>left</code> to just after its previous position. Track the max window width.</p>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Brute (all substrings + set)</td><td><span class="ans-cx">O(n³)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td>Window + HashSet (shrink one by one)</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(k)</span></td></tr>
        <tr><td><strong>Window + last-index map (jump)</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(k)</span></td></tr>
      </tbody></table>

      <h3>Java Code (Optimal — jump window)</h3>
      <pre class="code-block">public int lengthOfLongestSubstring(String s) {
    int[] last = new int[128];
    Arrays.fill(last, -1);            <span class="cc">// last index of each char</span>
    int left = 0, best = 0;
    for (int right = 0; right &lt; s.length(); right++) {
        char c = s.charAt(right);
        if (last[c] &gt;= left) {        <span class="cc">// duplicate inside the window</span>
            left = last[c] + 1;       <span class="cc">// jump past previous occurrence</span>
        }
        last[c] = right;
        best = Math.max(best, right - left + 1);
    }
    return best;
}</pre>

      <h3>Dry Run</h3>
      <p><code>"abcabcbb"</code>: window grows a,b,c (len3); at second 'a' (last=0 ≥ left) → left=1; continues sliding; max stays <strong>3</strong> ("abc"). <code>"bbbbb"</code> → 1; <code>"pwwkew"</code> → 3 ("wke").</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Setting <code>left = last[c] + 1</code> without the <code>last[c] &gt;= left</code> guard — a stale occurrence outside the window would wrongly move <code>left</code> backward.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>Distinguish "longest with all unique" (this) from "longest with at most k distinct" (LC 340) — same window skeleton, different shrink condition.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Track last index; on an in-window duplicate, jump <code>left</code> forward.</li><li>The <code>&gt;= left</code> guard prevents moving the window backward.</li></ul>`
  },

  "424": {
    id: "LC #424", title: "Longest Repeating Character Replacement", difficulty: "Medium", topic: "Strings · Sliding Window",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Variable sliding window</span>
        <span class="ans-chip">Max-frequency</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>You may replace at most <code>k</code> characters. Find the longest substring that becomes all-identical after replacements. A window is valid when <code>(windowLength − countOfMostFrequentChar) ≤ k</code> — i.e. the non-majority characters fit within the replacement budget.</p>

      <h3>Key Insight</h3>
      <p>Within a window, keep only the <strong>most frequent</strong> character; everything else must be replaced. If the count of "everything else" exceeds <code>k</code>, the window is invalid and must shrink.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int characterReplacement(String s, int k) {
    int[] count = new int[26];
    int left = 0, maxFreq = 0, best = 0;
    for (int right = 0; right &lt; s.length(); right++) {
        count[s.charAt(right) - 'A']++;
        maxFreq = Math.max(maxFreq, count[s.charAt(right) - 'A']);
        <span class="cc">// chars to replace = windowLen - maxFreq; if &gt; k, shrink</span>
        while ((right - left + 1) - maxFreq &gt; k) {
            count[s.charAt(left) - 'A']--;
            left++;
        }
        best = Math.max(best, right - left + 1);
    }
    return best;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> (26)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>s="AABABBA", k=1</code>: window "AABA" maxFreq(A)=3, replace=1≤1 valid (len4); pushing further exceeds budget so window slides; answer <strong>4</strong> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Subtle point</span><code>maxFreq</code> is never decreased when shrinking. That's fine: a stale (too-high) maxFreq only keeps the window from shrinking unnecessarily, and the answer (<code>best</code>) is still correct because it can only grow when a genuinely larger valid window appears.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Recomputing the true max frequency every shrink (O(26) extra) — unnecessary; the monotonic-best trick keeps it O(n).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Valid window ⇔ <code>len − maxFreq ≤ k</code>.</li><li>You don't need to decrement maxFreq on shrink — it never hurts correctness.</li></ul>`
  },

  "76": {
    id: "LC #76", title: "Minimum Window Substring", difficulty: "Hard", topic: "Strings · Sliding Window",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Variable sliding window</span>
        <span class="ans-chip">Need/have counts</span>
        <span class="ans-chip">Time O(n+m)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the smallest substring of <code>s</code> that contains all characters of <code>t</code> (including multiplicities). Return <code>""</code> if impossible. This is the canonical <strong>"minimum window covering a target"</strong> problem.</p>

      <h3>How It Works</h3>
      <p>Maintain a frequency map of what we <code>need</code> (from <code>t</code>) and a <code>have</code>/<code>formed</code> counter of how many required characters are currently satisfied. Expand <code>right</code> until the window is valid (covers <code>t</code>); then shrink <code>left</code> as far as possible while still valid, recording the smallest valid window.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public String minWindow(String s, String t) {
    if (s.length() &lt; t.length() || t.isEmpty()) return "";
    int[] need = new int[128];
    for (char c : t.toCharArray()) need[c]++;
    int required = t.length();        <span class="cc">// total chars still to cover</span>
    int left = 0, bestLen = Integer.MAX_VALUE, bestStart = 0;
    for (int right = 0; right &lt; s.length(); right++) {
        if (need[s.charAt(right)]-- &gt; 0) required--; <span class="cc">// covered one needed char</span>
        while (required == 0) {        <span class="cc">// window valid -&gt; try to shrink</span>
            if (right - left + 1 &lt; bestLen) {
                bestLen = right - left + 1;
                bestStart = left;
            }
            if (need[s.charAt(left)]++ == 0) required++; <span class="cc">// about to break validity</span>
            left++;
        }
    }
    return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLen);
}</pre>
      <p>Using a single <code>required</code> counter (instead of comparing whole maps) is what keeps each step O(1).</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n + m)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> (128 fixed)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>s="ADOBECODEBANC", t="ABC"</code>: first valid window "ADOBEC", shrink to "DOBEC"? invalid; expand to "...BANC" → shrink to "BANC" (len4). Smallest = <strong>"BANC"</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Comparing full frequency maps each step → O(n·128). Use a counter. (2) Forgetting the <code>required++</code> when removing a needed char on shrink. (3) Returning a window before fully shrinking it.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Pattern</span>This "expand to valid, then shrink to minimal" structure is the template for all minimum-window-cover problems (e.g. LC 567, 438 are fixed-size cousins).</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Duplicates in t?</strong> Handled — <code>need</code> stores multiplicities and <code>required</code> counts total chars.</li>
        <li><strong>What if t has chars not in s?</strong> The window never reaches <code>required == 0</code>; returns <code>""</code>.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Expand to valid, then shrink to minimal; record the best.</li><li>A single <code>required</code> counter keeps validity checks O(1).</li></ul>`
  },

  "567": {
    id: "LC #567", title: "Permutation in String", difficulty: "Medium", topic: "Strings · Fixed Sliding Window",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Fixed sliding window</span>
        <span class="ans-chip">Frequency match</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return <code>true</code> if <code>s2</code> contains any permutation of <code>s1</code> as a substring. A permutation has the same character frequencies, so we slide a <strong>fixed-size window</strong> (length <code>s1.length()</code>) over <code>s2</code> and compare frequency counts.</p>

      <h3>How It Works</h3>
      <p>Build the frequency array of <code>s1</code>. Slide a window of the same length over <code>s2</code>, maintaining its frequency array incrementally (add entering char, remove leaving char). If the two arrays ever match, a permutation exists.</p>

      <h3>Java Code (Optimal — match counter)</h3>
      <pre class="code-block">public boolean checkInclusion(String s1, String s2) {
    if (s1.length() &gt; s2.length()) return false;
    int[] need = new int[26], win = new int[26];
    for (int i = 0; i &lt; s1.length(); i++) {
        need[s1.charAt(i) - 'a']++;
        win[s2.charAt(i) - 'a']++;            <span class="cc">// first window</span>
    }
    int matches = 0;
    for (int i = 0; i &lt; 26; i++) if (need[i] == win[i]) matches++;
    for (int r = s1.length(); r &lt; s2.length(); r++) {
        if (matches == 26) return true;
        int in = s2.charAt(r) - 'a';
        int out = s2.charAt(r - s1.length()) - 'a';
        <span class="cc">// add entering char, updating the match count for that letter</span>
        win[in]++;
        if (win[in] == need[in]) matches++; else if (win[in] == need[in] + 1) matches--;
        <span class="cc">// remove leaving char</span>
        win[out]--;
        if (win[out] == need[out]) matches++; else if (win[out] == need[out] - 1) matches--;
    }
    return matches == 26;
}</pre>
      <p>Tracking a <code>matches</code> count (how many of the 26 letters have equal counts) makes each slide O(1) instead of O(26).</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span> (n = |s2|)</td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> (26)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>s1="ab", s2="eidbaooo"</code>: windows "ei","id","db","ba"… "ba" has counts {a:1,b:1} == need → <strong>true</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Simpler variant</span>If asked for clarity over speed, just compare the two 26-arrays with <code>Arrays.equals</code> each slide — O(26·n), still linear in practice and easier to write correctly.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span><code>s1</code> longer than <code>s2</code> → false immediately. Equal lengths → compare once.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Permutation ⇔ identical frequency counts.</li><li>Fixed window + incremental counts (or a match counter) → O(n).</li></ul>`
  },

  "438": {
    id: "LC #438", title: "Find All Anagrams in a String", difficulty: "Medium", topic: "Strings · Fixed Sliding Window",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Fixed sliding window</span>
        <span class="ans-chip">Frequency match</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return the start indices of every substring of <code>s</code> that is an anagram of <code>p</code>. Same machinery as <strong>Permutation in String (LC 567)</strong> — slide a fixed window of length <code>p.length()</code> and record every index where frequencies match.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;Integer&gt; findAnagrams(String s, String p) {
    List&lt;Integer&gt; res = new ArrayList&lt;&gt;();
    if (s.length() &lt; p.length()) return res;
    int[] need = new int[26], win = new int[26];
    for (char c : p.toCharArray()) need[c - 'a']++;
    int n = p.length();
    for (int i = 0; i &lt; s.length(); i++) {
        win[s.charAt(i) - 'a']++;                 <span class="cc">// add entering</span>
        if (i &gt;= n) win[s.charAt(i - n) - 'a']--; <span class="cc">// remove leaving</span>
        if (i &gt;= n - 1 &amp;&amp; Arrays.equals(win, need)) {
            res.add(i - n + 1);                   <span class="cc">// window start index</span>
        }
    }
    return res;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span> (26·n comparisons → O(n))</td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> + output</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>s="cbaebabacd", p="abc"</code>: window "cba" (i=2) matches → index 0; later "bac" (i=8) matches → index 6. Result <code>[0,6]</code> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>Recognize this and LC 567 as the same fixed-window template; only the output differs (boolean vs all indices). Mention the O(1)-per-slide match-counter optimization if asked to remove the 26-factor.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span><code>p</code> longer than <code>s</code> → empty list. Window comparison only starts once <code>i &gt;= n-1</code> (first full window).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Anagram substring search = fixed window of frequency counts.</li><li>Record the start index whenever window counts equal <code>p</code>'s counts.</li></ul>`
  }

});

/* ════════════════════════ STRINGS · ANAGRAM ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "242": {
    id: "LC #242", title: "Valid Anagram", difficulty: "Easy", topic: "Strings · Frequency Count",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Frequency count</span>
        <span class="ans-chip">Char array</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return <code>true</code> if <code>t</code> is an anagram of <code>s</code> (same characters, same counts). Count letters in one pass, decrement in another — if all counts return to zero, they are anagrams.</p>

      <h3>Java Code (Optimal — count array)</h3>
      <pre class="code-block">public boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false; <span class="cc">// quick reject</span>
    int[] count = new int[26];
    for (int i = 0; i &lt; s.length(); i++) {
        count[s.charAt(i) - 'a']++;
        count[t.charAt(i) - 'a']--;             <span class="cc">// net should be zero</span>
    }
    for (int c : count) if (c != 0) return false;
    return true;
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Sort both, compare</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td><strong>Count array</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>"anagram","nagaram"</code>: every increment from s is cancelled by a decrement from t → all zero → <strong>true</strong>. <code>"rat","car"</code> → counts not all zero → false ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Follow-up</span>Unicode input? A fixed 26-array won't work — use a <code>HashMap&lt;Character,Integer&gt;</code> (or count code points). Mention this when constraints aren't "lowercase a–z".</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>The length check first is a cheap, important early exit.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Increment for s, decrement for t; all-zero ⇒ anagram.</li><li>Fixed array for a–z; HashMap for arbitrary charsets.</li></ul>`
  },

  "49": {
    id: "LC #49", title: "Group Anagrams", difficulty: "Medium", topic: "Strings · Hashing by Signature",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">HashMap grouping</span>
        <span class="ans-chip">Canonical key</span>
        <span class="ans-chip">Time O(n·k)</span>
      </div>

      <h3>Overview</h3>
      <p>Group strings that are anagrams of each other. The idea: give every anagram the same <strong>canonical key</strong>, then bucket strings by that key in a HashMap.</p>

      <h3>Choosing the Key</h3>
      <ul>
        <li><strong>Sorted string</strong> — <code>"eat" → "aet"</code>. Simple; costs O(k log k) per word.</li>
        <li><strong>Count signature</strong> — a 26-length count encoded as a string like <code>"1#0#0#...1#"</code>. O(k) per word, faster for long words.</li>
      </ul>

      <h3>Java Code (Optimal — count signature)</h3>
      <pre class="code-block">public List&lt;List&lt;String&gt;&gt; groupAnagrams(String[] strs) {
    Map&lt;String, List&lt;String&gt;&gt; map = new HashMap&lt;&gt;();
    for (String s : strs) {
        int[] count = new int[26];
        for (char c : s.toCharArray()) count[c - 'a']++;
        StringBuilder key = new StringBuilder();
        for (int i = 0; i &lt; 26; i++) key.append('#').append(count[i]); <span class="cc">// canonical key</span>
        map.computeIfAbsent(key.toString(), x -&gt; new ArrayList&lt;&gt;()).add(s);
    }
    return new ArrayList&lt;&gt;(map.values());
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Key</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Sorted-string key</td><td><span class="ans-cx">O(n·k log k)</span></td><td><span class="ans-cx">O(n·k)</span></td></tr>
        <tr><td><strong>Count signature</strong></td><td><span class="ans-cx">O(n·k)</span></td><td><span class="ans-cx">O(n·k)</span></td></tr>
      </tbody></table>
      <p>n = number of strings, k = max string length.</p>

      <h3>Dry Run</h3>
      <p><code>["eat","tea","tan","ate","nat","bat"]</code> → keys: eat/tea/ate share one signature; tan/nat share another; bat alone → <code>[["eat","tea","ate"],["tan","nat"],["bat"]]</code> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>Lead with the sorted-key version (easiest to explain), then offer the count-signature as the optimization that drops the <code>log k</code> factor for long strings.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Building the count key without a delimiter (e.g. concatenating raw counts) — <code>[1,12]</code> and <code>[11,2]</code> could collide. The <code>#</code> separator prevents that.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Map each word to a canonical key; bucket by key.</li><li>Count signature beats sorting for long words; delimit it to avoid collisions.</li></ul>`
  },

  "1189": {
    id: "LC #1189", title: "Maximum Number of Balloons", difficulty: "Easy", topic: "Strings · Frequency Count",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Frequency count</span>
        <span class="ans-chip">Bottleneck letter</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>How many times can you spell <code>"balloon"</code> using the letters of <code>text</code> (each letter used once)? Count letters in <code>text</code>; the answer is limited by the <strong>scarcest required letter</strong>, accounting for letters that appear twice in "balloon" (l, o).</p>

      <h3>Key Insight</h3>
      <p>"balloon" needs: b·1, a·1, l·2, o·2, n·1. So divide counts of <code>l</code> and <code>o</code> by 2, then take the minimum across all five required letters.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int maxNumberOfBalloons(String text) {
    int[] c = new int[26];
    for (char ch : text.toCharArray()) c[ch - 'a']++;
    int b = c['b'-'a'];
    int a = c['a'-'a'];
    int l = c['l'-'a'] / 2;   <span class="cc">// 'l' used twice per balloon</span>
    int o = c['o'-'a'] / 2;   <span class="cc">// 'o' used twice per balloon</span>
    int n = c['n'-'a'];
    return Math.min(Math.min(b, a), Math.min(n, Math.min(l, o)));
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> (26)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>"loonbalxballpoon"</code>: b=2,a=2,l=4→2,o=4→2,n=2 → min = <strong>2</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Forgetting the double letters — not dividing <code>l</code> and <code>o</code> by 2 overcounts. This is the entire trick of the problem.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Answer = min over required letters of (available / needed).</li><li>Halve counts for letters that appear twice in the target word.</li></ul>`
  }

});

/* ════════════════════════ STRINGS · PALINDROME ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "125": {
    id: "LC #125", title: "Valid Palindrome", difficulty: "Easy", topic: "Strings · Two Pointers",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Two pointers</span>
        <span class="ans-chip">Filter alphanumeric</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Check whether a string is a palindrome, considering only <strong>alphanumeric</strong> characters and ignoring case. Two pointers from both ends, skipping non-alphanumeric characters — no extra string needed.</p>

      <h3>Java Code (Optimal — in-place two pointers)</h3>
      <pre class="code-block">public boolean isPalindrome(String s) {
    int l = 0, r = s.length() - 1;
    while (l &lt; r) {
        while (l &lt; r &amp;&amp; !Character.isLetterOrDigit(s.charAt(l))) l++; <span class="cc">// skip junk</span>
        while (l &lt; r &amp;&amp; !Character.isLetterOrDigit(s.charAt(r))) r--;
        if (Character.toLowerCase(s.charAt(l)) != Character.toLowerCase(s.charAt(r))) {
            return false;
        }
        l++; r--;
    }
    return true;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Clean + reverse + compare</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td><strong>Two pointers in place</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>"A man, a plan, a canal: Panama"</code>: pointers skip spaces/punctuation, compare a==a, m==m, … all match → <strong>true</strong>. <code>"race a car"</code> → r vs r ok, then mismatch → false ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Empty string or all-punctuation → <code>true</code> (no comparisons fail). Keep the inner <code>l &lt; r</code> guard so the skip loops don't run off the ends.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>The two-pointer version avoids building a cleaned copy (O(1) space) — call that out as the optimization over the clean-and-reverse approach.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Two pointers + skip non-alphanumeric → O(1) space.</li><li>Normalize case at comparison time.</li></ul>`
  },

  "680": {
    id: "LC #680", title: "Valid Palindrome II", difficulty: "Medium", topic: "Strings · Two Pointers",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Two pointers</span>
        <span class="ans-chip">One deletion</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return <code>true</code> if the string can become a palindrome by deleting <strong>at most one</strong> character. On the first mismatch, you have exactly two choices: skip the left char or skip the right char — try both.</p>

      <h3>Key Insight</h3>
      <p>Run standard two-pointer palindrome checking. At the first mismatch, the only way to recover with one deletion is to remove either <code>s[l]</code> or <code>s[r]</code>. So check whether either remaining substring is a plain palindrome.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public boolean validPalindrome(String s) {
    int l = 0, r = s.length() - 1;
    while (l &lt; r) {
        if (s.charAt(l) != s.charAt(r)) {
            <span class="cc">// try deleting left OR right, then must be a palindrome</span>
            return isPali(s, l + 1, r) || isPali(s, l, r - 1);
        }
        l++; r--;
    }
    return true;
}
private boolean isPali(String s, int l, int r) {
    while (l &lt; r) {
        if (s.charAt(l++) != s.charAt(r--)) return false;
    }
    return true;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span> — at most one extra linear check</td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>"abca"</code>: l=0(a),r=3(a) ok; l=1(b),r=2(c) mismatch → check "ca" delete-left ("c a"? = isPali(2,2)? "a"… actually isPali(s,2,2)="" true) → returns true (delete 'b') ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Trying only one side of the deletion. Both <code>s[l]</code> and <code>s[r]</code> must be considered at the mismatch — testing just one gives wrong answers (e.g. "ebcbbececabbacecbbcbe" style cases).</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Follow-up</span>"At most k deletions" generalizes to DP (longest palindromic subsequence): answer is <code>n − LPS ≤ k</code>.</div>

      <h3>Key Takeaways</h3>
      <ul><li>On first mismatch, branch on deleting left vs right.</li><li>Each branch is a single O(n) palindrome check → overall O(n).</li></ul>`
  },

  "5": {
    id: "LC #5", title: "Longest Palindromic Substring", difficulty: "Medium", topic: "Strings · Expand Around Center",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Expand around center</span>
        <span class="ans-chip">DP alternative</span>
        <span class="ans-chip">Time O(n²)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the longest contiguous palindromic substring. The clean, interview-friendly solution is <strong>expand around center</strong>: every palindrome has a center, so try all <code>2n−1</code> centers (each character and each gap between characters) and expand outward.</p>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th><th>Note</th></tr></thead>
      <tbody>
        <tr><td>Brute (check all substrings)</td><td><span class="ans-cx">O(n³)</span></td><td><span class="ans-cx">O(1)</span></td><td>Too slow</td></tr>
        <tr><td>DP table</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(n²)</span></td><td>Easy to reason, more memory</td></tr>
        <tr><td><strong>Expand around center</strong></td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)</span></td><td>Preferred</td></tr>
        <tr><td>Manacher's</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td><td>Rarely expected</td></tr>
      </tbody></table>

      <h3>Java Code (Optimal — expand around center)</h3>
      <pre class="code-block">public String longestPalindrome(String s) {
    if (s.length() &lt; 2) return s;
    int start = 0, maxLen = 1;
    for (int i = 0; i &lt; s.length(); i++) {
        int len1 = expand(s, i, i);     <span class="cc">// odd-length center</span>
        int len2 = expand(s, i, i + 1); <span class="cc">// even-length center</span>
        int len = Math.max(len1, len2);
        if (len &gt; maxLen) {
            maxLen = len;
            start = i - (len - 1) / 2;  <span class="cc">// derive start from center</span>
        }
    }
    return s.substring(start, start + maxLen);
}
private int expand(String s, int l, int r) {
    while (l &gt;= 0 &amp;&amp; r &lt; s.length() &amp;&amp; s.charAt(l) == s.charAt(r)) {
        l--; r++;
    }
    return r - l - 1;                   <span class="cc">// length of the palindrome</span>
}</pre>

      <h3>Dry Run</h3>
      <p><code>"babad"</code>: center at index1 ('a') expands to "bab" (len3); center at 2 ('b') → "aba" (len3). Answer <strong>"bab"</strong> (or "aba", both valid) ✓. <code>"cbbd"</code> → even center between the b's → "bb".</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Forgetting even-length centers (only checking <code>expand(i,i)</code>). (2) Off-by-one in <code>start = i - (len-1)/2</code>. (3) <code>return r - l - 1</code> — the loop overshoots by one on both sides.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>Expand-around-center is O(1) space and easy to write correctly; mention Manacher's exists for O(n) but is rarely required.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Try all 2n−1 centers; expand while characters match.</li><li>Handle odd and even centers separately.</li></ul>`
  },

  "647": {
    id: "LC #647", title: "Palindromic Substrings", difficulty: "Medium", topic: "Strings · Expand Around Center",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Expand around center</span>
        <span class="ans-chip">Counting</span>
        <span class="ans-chip">Time O(n²)</span>
      </div>

      <h3>Overview</h3>
      <p>Count how many palindromic substrings a string contains (different positions count separately). Same <strong>expand-around-center</strong> machinery as LC 5, but instead of tracking the longest, you <strong>count</strong> each successful expansion.</p>

      <h3>Key Insight</h3>
      <p>Every time an expansion step finds matching characters, that is one more palindrome. Sum the counts over all <code>2n−1</code> centers.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int countSubstrings(String s) {
    int count = 0;
    for (int i = 0; i &lt; s.length(); i++) {
        count += expand(s, i, i);     <span class="cc">// odd-length palindromes</span>
        count += expand(s, i, i + 1); <span class="cc">// even-length palindromes</span>
    }
    return count;
}
private int expand(String s, int l, int r) {
    int cnt = 0;
    while (l &gt;= 0 &amp;&amp; r &lt; s.length() &amp;&amp; s.charAt(l) == s.charAt(r)) {
        cnt++;   <span class="cc">// each match is a distinct palindrome</span>
        l--; r++;
    }
    return cnt;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n²)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>"aaa"</code>: centers yield "a","a","a" (3) + "aa","aa" (2) + "aaa" (1) = <strong>6</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>Point out that this is LC 5 with counting instead of max-tracking — recognizing the shared center-expansion pattern is the win.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Single character → 1. Every substring of all-same strings is a palindrome → n(n+1)/2 total.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Count each successful expansion step as one palindrome.</li><li>Same center-expansion skeleton as Longest Palindromic Substring.</li></ul>`
  }

});

/* ════════════════════════ MATRIX ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "54": {
    id: "LC #54", title: "Spiral Matrix", difficulty: "Medium", topic: "Matrix · Traversal",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Boundary shrinking</span>
        <span class="ans-chip">Layer traversal</span>
        <span class="ans-chip">Time O(m·n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return all matrix elements in spiral order (right → down → left → up, spiraling inward). The clean approach maintains four boundaries — <code>top, bottom, left, right</code> — and peels one layer at a time.</p>

      <h3>How It Works</h3>
      <p>Walk the top row L→R, the right column T→B, the bottom row R→L, the left column B→T; after each edge, move that boundary inward. Stop when boundaries cross.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;Integer&gt; spiralOrder(int[][] m) {
    List&lt;Integer&gt; res = new ArrayList&lt;&gt;();
    int top = 0, bottom = m.length - 1, left = 0, right = m[0].length - 1;
    while (top &lt;= bottom &amp;&amp; left &lt;= right) {
        for (int c = left; c &lt;= right; c++) res.add(m[top][c]);    <span class="cc">// → top row</span>
        top++;
        for (int r = top; r &lt;= bottom; r++) res.add(m[r][right]);  <span class="cc">// ↓ right col</span>
        right--;
        if (top &lt;= bottom) {                                       <span class="cc">// guard: row left</span>
            for (int c = right; c &gt;= left; c--) res.add(m[bottom][c]); <span class="cc">// ← bottom</span>
            bottom--;
        }
        if (left &lt;= right) {                                       <span class="cc">// guard: col left</span>
            for (int r = bottom; r &gt;= top; r--) res.add(m[r][left]);   <span class="cc">// ↑ left</span>
            left++;
        }
    }
    return res;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(m·n)</span> — each cell once</td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> extra (excluding output)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[1,2,3],[4,5,6],[7,8,9]]</code> → top row 1,2,3; right col 6,9; bottom row 8,7; left col 4; inner 5 → <code>[1,2,3,6,9,8,7,4,5]</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Omitting the <code>top &lt;= bottom</code> / <code>left &lt;= right</code> guards before the bottom row and left column. Without them, a single remaining row/column gets traversed twice (duplicate values) on non-square matrices.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Four shrinking boundaries traverse layer by layer.</li><li>Re-check boundaries before the reverse passes to avoid double-counting.</li></ul>`
  },

  "59": {
    id: "LC #59", title: "Spiral Matrix II", difficulty: "Medium", topic: "Matrix · Construction",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Boundary shrinking</span>
        <span class="ans-chip">Fill in spiral</span>
        <span class="ans-chip">Time O(n²)</span>
      </div>

      <h3>Overview</h3>
      <p>Generate an <code>n × n</code> matrix filled with <code>1..n²</code> in spiral order. Same four-boundary walk as Spiral Matrix (LC 54), but you <strong>write</strong> an incrementing counter instead of reading.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int[][] generateMatrix(int n) {
    int[][] m = new int[n][n];
    int top = 0, bottom = n - 1, left = 0, right = n - 1, val = 1;
    while (top &lt;= bottom &amp;&amp; left &lt;= right) {
        for (int c = left; c &lt;= right; c++) m[top][c] = val++;
        top++;
        for (int r = top; r &lt;= bottom; r++) m[r][right] = val++;
        right--;
        for (int c = right; c &gt;= left; c--) m[bottom][c] = val++;
        bottom--;
        for (int r = bottom; r &gt;= top; r--) m[r][left] = val++;
        left++;
    }
    return m;
}</pre>
      <p>Because the matrix is always square, the boundary guards from LC 54 aren't strictly required, but adding them keeps the code identical and safe.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n²)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> extra (excluding output)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>n=3</code> → top row 1,2,3; right col 4,5; bottom 6,7; left 8; center 9 → <code>[[1,2,3],[8,9,4],[7,6,5]]</code> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>This is the "write" twin of LC 54. Solving one means you solve both — emphasize the shared boundary-shrinking template.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Identical spiral walk; increment and write instead of read.</li><li>Square input simplifies the boundary guards.</li></ul>`
  },

  "200": {
    id: "LC #200", title: "Number of Islands", difficulty: "Medium", topic: "Matrix · DFS / BFS / Union-Find",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Grid DFS/BFS</span>
        <span class="ans-chip">Flood fill</span>
        <span class="ans-chip">Connected components</span>
      </div>

      <h3>Overview</h3>
      <p>Count islands of <code>'1'</code> (land) connected 4-directionally in a grid of <code>'1'</code>/<code>'0'</code>. This is a <strong>connected-components</strong> problem: each time you find unvisited land, flood-fill its whole island and increment the count.</p>

      <h3>How It Works (DFS flood fill)</h3>
      <p>Scan every cell. On an unvisited <code>'1'</code>, increment the island count and run DFS/BFS that sinks the entire connected landmass (mark visited) so it isn't counted again.</p>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th><th>Note</th></tr></thead>
      <tbody>
        <tr><td>DFS (recursion)</td><td><span class="ans-cx">O(m·n)</span></td><td><span class="ans-cx">O(m·n)</span> stack</td><td>Simplest</td></tr>
        <tr><td>BFS (queue)</td><td><span class="ans-cx">O(m·n)</span></td><td><span class="ans-cx">O(min(m,n))</span></td><td>Avoids deep recursion</td></tr>
        <tr><td>Union-Find</td><td><span class="ans-cx">O(m·n·α)</span></td><td><span class="ans-cx">O(m·n)</span></td><td>Good for streaming/unions</td></tr>
      </tbody></table>

      <h3>Java Code (Optimal — DFS, in-place marking)</h3>
      <pre class="code-block">public int numIslands(char[][] grid) {
    int count = 0;
    for (int r = 0; r &lt; grid.length; r++) {
        for (int c = 0; c &lt; grid[0].length; c++) {
            if (grid[r][c] == '1') {
                count++;
                dfs(grid, r, c);     <span class="cc">// sink the whole island</span>
            }
        }
    }
    return count;
}
private void dfs(char[][] g, int r, int c) {
    if (r &lt; 0 || c &lt; 0 || r &gt;= g.length || c &gt;= g[0].length || g[r][c] != '1') return;
    g[r][c] = '0';                   <span class="cc">// mark visited (sink)</span>
    dfs(g, r + 1, c); dfs(g, r - 1, c);
    dfs(g, r, c + 1); dfs(g, r, c - 1);
}</pre>

      <h3>Dry Run</h3>
      <p>Grid with two separate land clusters → first unvisited '1' triggers DFS that sinks cluster 1 (count=1); scan continues, finds cluster 2 (count=2). Answer <strong>2</strong> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Mutating input</span>Sinking land to <code>'0'</code> uses O(1) extra space but modifies the grid. If that's not allowed, keep a separate <code>visited</code> boolean matrix.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Counting diagonally connected land (problem is 4-directional). (2) Re-counting cells — always mark before/at visit. (3) Stack overflow on huge grids — switch to BFS.</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>Max Area of Island (LC 695)?</strong> DFS returns the size; track the max.</li>
        <li><strong>Number of distinct islands (LC 694)?</strong> Record each island's shape (relative path) in a set.</li>
        <li><strong>Streaming additions (LC 305)?</strong> Union-Find shines here.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>Each new unvisited land cell = one island; flood-fill the rest.</li><li>Mark cells visited to avoid recounting; BFS avoids deep recursion.</li></ul>`
  },

  "73": {
    id: "LC #73", title: "Set Matrix Zeroes", difficulty: "Medium", topic: "Matrix · In-place Marking",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">In-place markers</span>
        <span class="ans-chip">First row/col as flags</span>
        <span class="ans-chip">Space O(1)</span>
      </div>

      <h3>Overview</h3>
      <p>If a cell is 0, set its entire row and column to 0 — <strong>in place</strong>. The challenge is doing it in O(1) extra space without prematurely zeroing cells you still need to read.</p>

      <h3>Key Insight</h3>
      <p>Use the matrix's own <strong>first row and first column as marker storage</strong>: if <code>m[r][c]==0</code>, set <code>m[r][0]=0</code> and <code>m[0][c]=0</code>. Two boolean flags track whether the first row/column themselves need zeroing (since they double as markers).</p>

      <h3>Java Code (Optimal — O(1) space)</h3>
      <pre class="code-block">public void setZeroes(int[][] m) {
    int rows = m.length, cols = m[0].length;
    boolean firstRow = false, firstCol = false;
    for (int c = 0; c &lt; cols; c++) if (m[0][c] == 0) firstRow = true;
    for (int r = 0; r &lt; rows; r++) if (m[r][0] == 0) firstCol = true;
    <span class="cc">// use row 0 / col 0 as markers for the inner matrix</span>
    for (int r = 1; r &lt; rows; r++)
        for (int c = 1; c &lt; cols; c++)
            if (m[r][c] == 0) { m[r][0] = 0; m[0][c] = 0; }
    <span class="cc">// apply markers to the inner matrix</span>
    for (int r = 1; r &lt; rows; r++)
        for (int c = 1; c &lt; cols; c++)
            if (m[r][0] == 0 || m[0][c] == 0) m[r][c] = 0;
    <span class="cc">// finally handle first row / col</span>
    if (firstRow) for (int c = 0; c &lt; cols; c++) m[0][c] = 0;
    if (firstCol) for (int r = 0; r &lt; rows; r++) m[r][0] = 0;
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Sets of zero rows/cols</td><td><span class="ans-cx">O(m·n)</span></td><td><span class="ans-cx">O(m+n)</span></td></tr>
        <tr><td><strong>First row/col markers</strong></td><td><span class="ans-cx">O(m·n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[1,1,1],[1,0,1],[1,1,1]]</code>: m[1][1]=0 sets marker m[1][0]=0,m[0][1]=0 → apply → middle row &amp; column zeroed → <code>[[1,0,1],[0,0,0],[1,0,1]]</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Zeroing rows/cols during the first scan → corrupts data you still need. Mark first, apply later. (2) Forgetting the first-row/first-col flags — they are markers, so their own zero-state must be captured separately.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Reuse first row/column as O(1) marker storage.</li><li>Two passes: record markers, then apply; handle row 0 / col 0 last.</li></ul>`
  },

  "79": {
    id: "LC #79", title: "Word Search", difficulty: "Medium", topic: "Matrix · Backtracking (DFS)",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Backtracking</span>
        <span class="ans-chip">Grid DFS</span>
        <span class="ans-chip">Visited marking</span>
      </div>

      <h3>Overview</h3>
      <p>Determine whether a word exists in the grid by moving 4-directionally through adjacent cells, using each cell at most once. This is <strong>backtracking</strong>: explore a path, and undo (un-mark) the cell when a branch fails.</p>

      <h3>How It Works</h3>
      <p>From each cell matching the word's first letter, DFS along the four directions matching successive letters. Temporarily mark visited cells to forbid reuse, then restore them on backtrack.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public boolean exist(char[][] board, String word) {
    for (int r = 0; r &lt; board.length; r++)
        for (int c = 0; c &lt; board[0].length; c++)
            if (dfs(board, word, r, c, 0)) return true;
    return false;
}
private boolean dfs(char[][] b, String w, int r, int c, int i) {
    if (i == w.length()) return true;                 <span class="cc">// all letters matched</span>
    if (r &lt; 0 || c &lt; 0 || r &gt;= b.length || c &gt;= b[0].length
        || b[r][c] != w.charAt(i)) return false;
    char tmp = b[r][c];
    b[r][c] = '#';                                    <span class="cc">// mark visited</span>
    boolean found = dfs(b, w, r+1, c, i+1) || dfs(b, w, r-1, c, i+1)
                 || dfs(b, w, r, c+1, i+1) || dfs(b, w, r, c-1, i+1);
    b[r][c] = tmp;                                    <span class="cc">// backtrack (restore)</span>
    return found;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Time</td><td><span class="ans-cx">O(m·n·4^L)</span> — L = word length</td></tr>
        <tr><td>Space</td><td><span class="ans-cx">O(L)</span> recursion depth</td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p>Board <code>[[A,B,C,E],[S,F,C,S],[A,D,E,E]]</code>, word "ABCCED": start at A(0,0)→B→C→C(down)→E→D → all matched → <strong>true</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Not restoring the cell on backtrack → blocks other valid paths. (2) Forgetting the success base case <code>i == word.length()</code>. (3) Using a separate visited set when in-place marking is simpler and O(1).</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Optimization</span>Early-prune: if the board's letter frequencies can't cover the word, return false immediately. For many words (LC 212), use a Trie.</div>

      <h3>Key Takeaways</h3>
      <ul><li>DFS + mark/restore is the backtracking signature.</li><li>In-place marking avoids extra visited storage.</li></ul>`
  },

  "240": {
    id: "LC #240", title: "Search a 2D Matrix II", difficulty: "Medium", topic: "Matrix · Staircase Search",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Staircase search</span>
        <span class="ans-chip">Sorted rows & cols</span>
        <span class="ans-chip">Time O(m+n)</span>
      </div>

      <h3>Overview</h3>
      <p>Search a target in a matrix where each row is sorted left→right and each column top→bottom. The elegant trick is the <strong>staircase search</strong> starting from the top-right (or bottom-left) corner.</p>

      <h3>Key Insight</h3>
      <p>From the top-right corner, the current value is the largest in its row and smallest in its column. So if it's too big, eliminate the whole column (move left); if too small, eliminate the whole row (move down). Each step removes one row or column.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public boolean searchMatrix(int[][] m, int target) {
    int r = 0, c = m[0].length - 1;        <span class="cc">// start top-right</span>
    while (r &lt; m.length &amp;&amp; c &gt;= 0) {
        if (m[r][c] == target) return true;
        else if (m[r][c] &gt; target) c--;    <span class="cc">// too big -&gt; drop column</span>
        else r++;                          <span class="cc">// too small -&gt; drop row</span>
    }
    return false;
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Scan every cell</td><td><span class="ans-cx">O(m·n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td>Binary search each row</td><td><span class="ans-cx">O(m log n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Staircase</strong></td><td><span class="ans-cx">O(m+n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p>Target 5, start top-right (say 15): 15&gt;5 → left … reach a value &lt;5 → down … converges to 5 → <strong>true</strong> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Don't confuse with LC 74</span>Here rows/cols are sorted but the matrix is <em>not</em> one fully-sorted sequence, so plain binary search over <code>m·n</code> doesn't apply — that's LC 74's property.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Starting from top-left or bottom-right — those corners don't give a clean elimination direction (both neighbors increase/decrease).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Start at a corner where one direction increases and the other decreases.</li><li>Each comparison eliminates a full row or column → O(m+n).</li></ul>`
  },

  "48": {
    id: "LC #48", title: "Rotate Image", difficulty: "Medium", topic: "Matrix · In-place Rotation",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Transpose + reverse</span>
        <span class="ans-chip">In-place</span>
        <span class="ans-chip">Time O(n²)</span>
      </div>

      <h3>Overview</h3>
      <p>Rotate an <code>n × n</code> image 90° clockwise <strong>in place</strong>. The clean trick: <strong>transpose</strong> the matrix (swap across the main diagonal), then <strong>reverse each row</strong>.</p>

      <h3>Why Transpose + Reverse = 90° CW</h3>
      <p>Transposing turns rows into columns; reversing each row then places elements in their rotated positions. (For counter-clockwise: transpose then reverse each <em>column</em>, or reverse rows first.)</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public void rotate(int[][] m) {
    int n = m.length;
    <span class="cc">// 1) transpose: swap m[i][j] with m[j][i]</span>
    for (int i = 0; i &lt; n; i++)
        for (int j = i + 1; j &lt; n; j++) {
            int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t;
        }
    <span class="cc">// 2) reverse each row</span>
    for (int i = 0; i &lt; n; i++) {
        int l = 0, r = n - 1;
        while (l &lt; r) {
            int t = m[i][l]; m[i][l] = m[i][r]; m[i][r] = t;
            l++; r--;
        }
    }
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n²)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[1,2,3],[4,5,6],[7,8,9]]</code> → transpose <code>[[1,4,7],[2,5,8],[3,6,9]]</code> → reverse rows → <code>[[7,4,1],[8,5,2],[9,6,3]]</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Transposing with <code>j</code> from 0 (double-swaps back to original) — start inner loop at <code>j = i + 1</code>. (2) Reversing columns instead of rows (gives CCW).</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Alternative</span>Four-way cyclic swap of corners layer by layer also works in O(1) space but is more error-prone; transpose+reverse is the interview favorite.</div>

      <h3>Key Takeaways</h3>
      <ul><li>90° CW = transpose then reverse each row.</li><li>Transpose only the upper triangle (<code>j &gt; i</code>) to avoid undoing swaps.</li></ul>`
  },

  "74": {
    id: "LC #74", title: "Search a 2D Matrix", difficulty: "Medium", topic: "Matrix · Binary Search",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Binary search</span>
        <span class="ans-chip">Flatten index</span>
        <span class="ans-chip">Time O(log(m·n))</span>
      </div>

      <h3>Overview</h3>
      <p>The matrix is sorted so that each row's first element exceeds the previous row's last — i.e. it behaves like one sorted array of length <code>m·n</code>. So a single <strong>binary search</strong> over a virtual flattened index solves it in O(log(m·n)).</p>

      <h3>Key Insight</h3>
      <p>Map a 1D index <code>mid</code> to 2D: <code>row = mid / cols</code>, <code>col = mid % cols</code>. Then run ordinary binary search on <code>[0, m·n − 1]</code>.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public boolean searchMatrix(int[][] m, int target) {
    int rows = m.length, cols = m[0].length;
    int lo = 0, hi = rows * cols - 1;
    while (lo &lt;= hi) {
        int mid = lo + (hi - lo) / 2;
        int val = m[mid / cols][mid % cols];   <span class="cc">// 1D -&gt; 2D mapping</span>
        if (val == target) return true;
        else if (val &lt; target) lo = mid + 1;
        else hi = mid - 1;
    }
    return false;
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Staircase (treats as LC 240)</td><td><span class="ans-cx">O(m+n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Flattened binary search</strong></td><td><span class="ans-cx">O(log(m·n))</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[1,3,5,7],[10,11,16,20],[23,30,34,60]]</code>, target 3, cols=4: lo=0,hi=11,mid=5 → m[1][1]=11&gt;3 → hi=4; mid=2 → m[0][2]=5&gt;3 → hi=1; mid=0 → m[0][0]=1&lt;3 → lo=1; mid=1 → m[0][1]=3 → <strong>true</strong> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">LC 74 vs LC 240</span>LC 74's stronger sorting (rows chained) enables true O(log) binary search. LC 240 only guarantees per-row/col sorting → staircase O(m+n). Know which property you have.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Overflow in <code>rows*cols</code> for huge dimensions, and using <code>(lo+hi)/2</code> — prefer <code>lo + (hi-lo)/2</code>.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Chained-sorted matrix = one sorted array; binary search the flat index.</li><li><code>row = mid/cols</code>, <code>col = mid%cols</code>.</li></ul>`
  },

  "36": {
    id: "LC #36", title: "Valid Sudoku", difficulty: "Medium", topic: "Matrix · HashSet Validation",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">HashSet</span>
        <span class="ans-chip">Box index math</span>
        <span class="ans-chip">Time O(1)</span>
      </div>

      <h3>Overview</h3>
      <p>Validate a partially filled 9×9 board: no duplicate digit within any row, column, or 3×3 box (empty cells <code>'.'</code> ignored). The trick is tracking seen digits for all three constraints in a single pass.</p>

      <h3>Key Insight</h3>
      <p>Maintain seen-sets for 9 rows, 9 columns, and 9 boxes. Map a cell to its box index with <code>box = (r/3)*3 + (c/3)</code>. A single pass checks all three constraints.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public boolean isValidSudoku(char[][] board) {
    Set&lt;String&gt; seen = new HashSet&lt;&gt;();
    for (int r = 0; r &lt; 9; r++) {
        for (int c = 0; c &lt; 9; c++) {
            char d = board[r][c];
            if (d == '.') continue;
            int box = (r / 3) * 3 + (c / 3);
            <span class="cc">// encode each constraint as a unique string token</span>
            if (!seen.add(d + "@row" + r)
             || !seen.add(d + "@col" + c)
             || !seen.add(d + "@box" + box)) {
                return false;          <span class="cc">// duplicate found</span>
            }
        }
    }
    return true;
}</pre>
      <p>Faster variant: three <code>boolean[9][9]</code> arrays (rows, cols, boxes) avoid string allocation — preferred when performance matters.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(1)</span> — fixed 81 cells</td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> — bounded sets</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>Adding "5@row0", "5@col0", "5@box0" for the first 5; if another 5 appears in row 0, <code>seen.add("5@row0")</code> returns false → invalid ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Wrong box formula — <code>(r/3)*3 + c/3</code> is the standard. (2) Validating <em>solvability</em> — the task only checks current validity, not whether a solution exists.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Follow-up</span>Sudoku Solver (LC 37) builds on this validity check with backtracking.</div>

      <h3>Key Takeaways</h3>
      <ul><li>One pass, three constraint sets (row/col/box).</li><li>Box index: <code>(r/3)*3 + c/3</code>.</li></ul>`
  }

});

/* ════════════════════════ STACK ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "20": {
    id: "LC #20", title: "Valid Parentheses", difficulty: "Easy", topic: "Stack · Matching",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Stack</span>
        <span class="ans-chip">Matching pairs</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Given a string of <code>()[]{}</code>, decide if brackets are correctly matched and nested. A <strong>stack</strong> is the natural fit: push opening brackets, and on a closing bracket verify it matches the most recent unmatched opener.</p>

      <h3>How It Works</h3>
      <p>Push every opening bracket. For each closing bracket, the top of the stack must be its matching opener — otherwise it's invalid. At the end, the stack must be empty (no unclosed openers).</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public boolean isValid(String s) {
    Deque&lt;Character&gt; stack = new ArrayDeque&lt;&gt;();
    for (char c : s.toCharArray()) {
        switch (c) {
            case '(' -&gt; stack.push(')');   <span class="cc">// push the EXPECTED closer</span>
            case '[' -&gt; stack.push(']');
            case '{' -&gt; stack.push('}');
            default  -&gt; { if (stack.isEmpty() || stack.pop() != c) return false; }
        }
    }
    return stack.isEmpty();                 <span class="cc">// all openers closed</span>
}</pre>
      <p>Pushing the <em>expected closing</em> bracket makes the comparison a single equality check.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>"([{}])"</code>: push ) ] }; on '}' pop }=match; on ']' pop ]=match; on ')' pop )=match → empty → <strong>true</strong>. <code>"(]"</code>: push ); on ']' pop )≠] → false ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Forgetting the empty-stack check before popping on a closer → exception / wrong result on <code>")"</code>. (2) Not checking the stack is empty at the end → accepts <code>"("</code>.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>Use <code>ArrayDeque</code>, not the legacy <code>Stack</code> class (synchronized, slower). This pattern generalizes to any "matching/nesting" validation.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Stack tracks the most recent unmatched opener (LIFO).</li><li>Empty stack at the end ⇒ fully balanced.</li></ul>`
  },

  "150": {
    id: "LC #150", title: "Evaluate Reverse Polish Notation", difficulty: "Medium", topic: "Stack · Expression Eval",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Stack</span>
        <span class="ans-chip">Postfix evaluation</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Evaluate an arithmetic expression in Reverse Polish (postfix) Notation. Operands are pushed; on an operator, pop the two most recent operands, apply, and push the result.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int evalRPN(String[] tokens) {
    Deque&lt;Integer&gt; st = new ArrayDeque&lt;&gt;();
    for (String t : tokens) {
        switch (t) {
            case "+" -&gt; st.push(st.pop() + st.pop());
            case "*" -&gt; st.push(st.pop() * st.pop());
            case "-" -&gt; { int b = st.pop(), a = st.pop(); st.push(a - b); } <span class="cc">// order matters</span>
            case "/" -&gt; { int b = st.pop(), a = st.pop(); st.push(a / b); }
            default  -&gt; st.push(Integer.parseInt(t));                       <span class="cc">// operand</span>
        }
    }
    return st.pop();
}</pre>
      <p>For <code>-</code> and <code>/</code>, order matters: the first popped is the right operand. Addition/multiplication are commutative so order is irrelevant.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>["2","1","+","3","*"]</code>: push 2,1; '+' → 3; push 3; '*' → 9. Result <strong>9</strong> = (2+1)*3 ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Swapping operands for non-commutative ops. Always pop <code>b</code> (right) first, then <code>a</code> (left), and compute <code>a − b</code> / <code>a / b</code>.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Related</span>Infix evaluation (LC 224/227) needs operator-precedence handling; postfix is simpler because precedence is already encoded in the token order.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Postfix eval = push operands, apply operators to the top two.</li><li>Mind operand order for subtraction and division.</li></ul>`
  },

  "739": {
    id: "LC #739", title: "Daily Temperatures", difficulty: "Medium", topic: "Stack · Monotonic",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Monotonic stack</span>
        <span class="ans-chip">Next greater element</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>For each day, find how many days until a warmer temperature. This is a <strong>next greater element</strong> problem solved with a <strong>monotonic decreasing stack</strong> of indices.</p>

      <h3>How It Works</h3>
      <p>Keep a stack of indices whose answers are still pending, with temperatures in decreasing order. When today's temperature exceeds the temperature at the stack top, that earlier day's "warmer day" is today — pop it and record the gap.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int[] dailyTemperatures(int[] t) {
    int n = t.length;
    int[] res = new int[n];
    Deque&lt;Integer&gt; stack = new ArrayDeque&lt;&gt;(); <span class="cc">// indices, temps decreasing</span>
    for (int i = 0; i &lt; n; i++) {
        while (!stack.isEmpty() &amp;&amp; t[i] &gt; t[stack.peek()]) {
            int prev = stack.pop();
            res[prev] = i - prev;                 <span class="cc">// days until warmer</span>
        }
        stack.push(i);
    }
    return res;                                   <span class="cc">// unresolved days stay 0</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Brute (scan ahead)</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Monotonic stack</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[73,74,75,71,69,72,76,73]</code> → <code>[1,1,4,2,1,1,0,0]</code>. Each index is pushed/popped once → linear.</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Pattern</span>Monotonic stack solves "next greater/smaller element" families (LC 496, 503, 901). Store <em>indices</em> when you need distances; store values when you only need the element.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Days with no warmer future stay <code>0</code> (default array value) — no special handling needed.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Decreasing monotonic stack of indices resolves next-greater in O(n).</li><li>Each element is pushed and popped at most once.</li></ul>`
  },

  "155": {
    id: "LC #155", title: "Min Stack", difficulty: "Medium", topic: "Stack · Design",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Auxiliary stack</span>
        <span class="ans-chip">O(1) getMin</span>
        <span class="ans-chip">Design</span>
      </div>

      <h3>Overview</h3>
      <p>Design a stack supporting <code>push</code>, <code>pop</code>, <code>top</code>, and <code>getMin</code> all in <strong>O(1)</strong>. The trick is tracking the minimum alongside the data so <code>getMin</code> never scans.</p>

      <h3>How It Works</h3>
      <p>Keep a second stack of running minimums. On each push, store <code>min(value, currentMin)</code>; the two stacks stay in lockstep, so the min stack's top is always the current minimum.</p>

      <h3>Java Code (Optimal — two stacks)</h3>
      <pre class="code-block">class MinStack {
    private final Deque&lt;Integer&gt; data = new ArrayDeque&lt;&gt;();
    private final Deque&lt;Integer&gt; mins = new ArrayDeque&lt;&gt;();

    public void push(int val) {
        data.push(val);
        mins.push(mins.isEmpty() ? val : Math.min(val, mins.peek()));
    }
    public void pop()    { data.pop(); mins.pop(); }   <span class="cc">// pop both</span>
    public int top()     { return data.peek(); }
    public int getMin()  { return mins.peek(); }       <span class="cc">// O(1)</span>
}</pre>
      <p><strong>Space optimization:</strong> store on the min stack only when a new value is <code>≤</code> current min, and pop it when the popped data value equals it. Saves memory at the cost of slightly trickier logic.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Operation</th><th>Time</th></tr></thead>
      <tbody><tr><td>push / pop / top / getMin</td><td><span class="ans-cx">O(1)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>push(−2),push(0),push(−3): mins=[−2,−2,−3]. getMin→−3. pop. getMin→−2. top→0 ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Scanning the data stack for the min on each <code>getMin</code> → O(n). The whole point is O(1) via the auxiliary min tracking.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Single-stack trick</span>Store the running min encoded with each element (e.g. push a pair, or push <code>2*val − min</code>) — a classic follow-up to reduce to one stack.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Carry the running minimum so getMin is O(1).</li><li>Keep the auxiliary stack in lockstep with pushes/pops.</li></ul>`
  },

  "496": {
    id: "LC #496", title: "Next Greater Element I", difficulty: "Easy", topic: "Stack · Monotonic + HashMap",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Monotonic stack</span>
        <span class="ans-chip">HashMap lookup</span>
        <span class="ans-chip">Time O(n+m)</span>
      </div>

      <h3>Overview</h3>
      <p>For each element of <code>nums1</code> (a subset of <code>nums2</code>), find its next greater element to the right in <code>nums2</code>. Precompute every "next greater" in <code>nums2</code> with a monotonic stack, store in a map, then answer each query in O(1).</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int[] nextGreaterElement(int[] nums1, int[] nums2) {
    Map&lt;Integer, Integer&gt; nextGreater = new HashMap&lt;&gt;();
    Deque&lt;Integer&gt; stack = new ArrayDeque&lt;&gt;();   <span class="cc">// decreasing values</span>
    for (int x : nums2) {
        while (!stack.isEmpty() &amp;&amp; x &gt; stack.peek()) {
            nextGreater.put(stack.pop(), x);       <span class="cc">// x is the answer for popped</span>
        }
        stack.push(x);
    }
    int[] res = new int[nums1.length];
    for (int i = 0; i &lt; nums1.length; i++) {
        res[i] = nextGreater.getOrDefault(nums1[i], -1);
    }
    return res;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Brute (nested scan)</td><td><span class="ans-cx">O(n·m)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Monotonic stack + map</strong></td><td><span class="ans-cx">O(n+m)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>nums2=[1,3,4,2]</code> → map: 1→3, 3→4, 4→(none), 2→(none). <code>nums1=[4,1,2]</code> → <code>[-1,3,-1]</code> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Pattern</span>Values are distinct here, so a value→answer map works. For duplicates (LC 503, circular), key by index instead.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Precompute next-greater for the big array with a monotonic stack.</li><li>HashMap turns each query into O(1).</li></ul>`
  },

  "84": {
    id: "LC #84", title: "Largest Rectangle in Histogram", difficulty: "Hard", topic: "Stack · Monotonic",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Monotonic stack</span>
        <span class="ans-chip">Span = next/prev smaller</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the largest rectangle area in a histogram. For each bar, the widest rectangle of that bar's height extends until a strictly shorter bar on each side. A <strong>monotonic increasing stack</strong> finds these boundaries in O(n).</p>

      <h3>Key Insight</h3>
      <p>When a bar shorter than the stack top arrives, the top bar can't extend further right — pop it and compute its rectangle. Its width spans from just after the new stack top to the current index.</p>

      <h3>Java Code (Optimal — sentinel trick)</h3>
      <pre class="code-block">public int largestRectangleArea(int[] heights) {
    int n = heights.length, maxArea = 0;
    Deque&lt;Integer&gt; stack = new ArrayDeque&lt;&gt;(); <span class="cc">// indices, increasing heights</span>
    for (int i = 0; i &lt;= n; i++) {
        int h = (i == n) ? 0 : heights[i];     <span class="cc">// virtual 0 flushes stack at end</span>
        while (!stack.isEmpty() &amp;&amp; h &lt; heights[stack.peek()]) {
            int height = heights[stack.pop()];
            int width = stack.isEmpty() ? i : i - stack.peek() - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }
    return maxArea;
}</pre>
      <p>The trailing virtual bar of height 0 forces every remaining bar to be popped and measured.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Brute (expand each bar)</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Monotonic stack</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[2,1,5,6,2,3]</code> → largest = <strong>10</strong> (bars 5,6 → height 5 × width 2). The stack pops 6 then 5 when the 2 arrives, computing widths correctly.</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Width formula — when the stack empties after a pop, width is <code>i</code> (extends to the start). (2) Forgetting the flushing sentinel, leaving tall trailing bars unmeasured.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Builds toward LC 85</span>Maximal Rectangle reduces each row to a histogram and reuses this exact function.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Each bar's width = next-smaller − prev-smaller − 1, found via a monotonic stack.</li><li>A trailing 0 sentinel cleanly flushes the stack.</li></ul>`
  },

  "85": {
    id: "LC #85", title: "Maximal Rectangle", difficulty: "Hard", topic: "Matrix · Stack (Histogram)",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Row histograms</span>
        <span class="ans-chip">Reuse LC 84</span>
        <span class="ans-chip">Time O(m·n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the largest rectangle of <code>'1'</code>s in a binary matrix. The key reduction: treat each row as the base of a histogram where each column's height is the run of consecutive <code>1</code>s ending at that row — then apply <strong>Largest Rectangle in Histogram (LC 84)</strong> per row.</p>

      <h3>How It Works</h3>
      <ol>
        <li>Maintain a <code>heights[]</code> array across rows. For each cell: if <code>'1'</code>, <code>heights[c]++</code>; if <code>'0'</code>, reset to 0.</li>
        <li>After processing each row, compute the largest histogram rectangle for the current <code>heights</code> and track the global max.</li>
      </ol>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int maximalRectangle(char[][] matrix) {
    if (matrix.length == 0) return 0;
    int cols = matrix[0].length, best = 0;
    int[] heights = new int[cols];
    for (char[] row : matrix) {
        for (int c = 0; c &lt; cols; c++) {
            heights[c] = (row[c] == '1') ? heights[c] + 1 : 0; <span class="cc">// build histogram</span>
        }
        best = Math.max(best, largestRectangleArea(heights));  <span class="cc">// reuse LC 84</span>
    }
    return best;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(m·n)</span> — O(n) histogram per row</td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>For a matrix whose rows accumulate heights like <code>[1,0,1,0,0] → [2,0,2,1,1] → [3,1,3,2,2] → [4,0,0,3,0]</code>, the max histogram area across rows gives <strong>6</strong>.</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>The elegance is the reduction: recognizing that "rectangle of 1s" = "tallest histogram over evolving column heights." Mention LC 84 as the subroutine.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Forgetting to reset a column's height to 0 on a <code>'0'</code> — heights must represent <em>consecutive</em> ones ending at the current row.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Convert each row into a histogram of consecutive-1 heights.</li><li>Apply the LC 84 monotonic-stack routine per row.</li></ul>`
  },

  "224": {
    id: "LC #224", title: "Basic Calculator", difficulty: "Hard", topic: "Stack · Expression Eval",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Stack</span>
        <span class="ans-chip">Sign tracking</span>
        <span class="ans-chip">Parentheses</span>
      </div>

      <h3>Overview</h3>
      <p>Evaluate an expression with <code>+</code>, <code>-</code>, parentheses, and non-negative integers (no <code>*</code>/<code>/</code>). The clean approach uses a <strong>stack to save context across parentheses</strong> and a running sign.</p>

      <h3>How It Works</h3>
      <p>Track a running <code>result</code> and current <code>sign</code> (+1/−1). On a digit, build the number and add <code>sign × number</code>. On <code>(</code>, push the current <code>result</code> and <code>sign</code>, then reset. On <code>)</code>, fold the inner result back into the saved context.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int calculate(String s) {
    Deque&lt;Integer&gt; stack = new ArrayDeque&lt;&gt;();
    int result = 0, number = 0, sign = 1;
    for (char c : s.toCharArray()) {
        if (Character.isDigit(c)) {
            number = number * 10 + (c - '0');          <span class="cc">// multi-digit</span>
        } else if (c == '+' || c == '-') {
            result += sign * number;                   <span class="cc">// commit previous number</span>
            number = 0;
            sign = (c == '+') ? 1 : -1;
        } else if (c == '(') {
            stack.push(result); stack.push(sign);      <span class="cc">// save context</span>
            result = 0; sign = 1;
        } else if (c == ')') {
            result += sign * number; number = 0;
            result = result * stack.pop() + stack.pop(); <span class="cc">// × saved sign, + prior result</span>
        }
    }
    return result + sign * number;                     <span class="cc">// commit trailing number</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span> (nesting depth)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>"(1+(4+5+2)-3)+(6+8)"</code> = 23. At each <code>)</code> the inner sum folds into the saved outer result with the saved sign.</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Not committing the last number after the loop. (2) Mishandling the saved sign vs result order on <code>)</code>. (3) Ignoring spaces — the digit/operator checks skip them naturally.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Variants</span>LC 227 adds <code>*</code>/<code>/</code> (no parens) → keep a stack of terms; LC 772 combines both → two-stack or recursion.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Running result + sign handles +/−; stack saves context per parenthesis.</li><li>Always commit the final pending number.</li></ul>`
  }

});

/* ════════════════════════ QUEUE ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "gfg-reverse-k-queue": {
    id: "GFG", title: "Reversing First K Elements of a Queue", difficulty: "Medium", topic: "Queue · Stack",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Queue + Stack</span>
        <span class="ans-chip">Partial reverse</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Reverse only the first <code>k</code> elements of a queue, keeping the remaining <code>n − k</code> in their original order. A <strong>stack</strong> reverses the front portion; queue rotation re-appends the rest.</p>

      <h3>Algorithm</h3>
      <ol>
        <li><strong>Dequeue</strong> the first <code>k</code> elements into a stack (this reverses them).</li>
        <li><strong>Pop</strong> the stack back into the queue — now the first k are reversed but sit at the back.</li>
        <li><strong>Rotate</strong>: dequeue and re-enqueue the remaining <code>n − k</code> elements to bring the reversed block to the front.</li>
      </ol>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public Queue&lt;Integer&gt; modifyQueue(Queue&lt;Integer&gt; q, int k) {
    if (q == null || k &lt;= 0 || k &gt; q.size()) return q;
    Deque&lt;Integer&gt; stack = new ArrayDeque&lt;&gt;();
    for (int i = 0; i &lt; k; i++) stack.push(q.poll());      <span class="cc">// 1) front k -&gt; stack</span>
    while (!stack.isEmpty()) q.offer(stack.pop());          <span class="cc">// 2) reversed to back</span>
    int rest = q.size() - k;
    for (int i = 0; i &lt; rest; i++) q.offer(q.poll());       <span class="cc">// 3) rotate rest around</span>
    return q;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(k)</span> (stack)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>Queue <code>[1,2,3,4,5]</code>, k=3: stack=[3,2,1] (top 1); pop to queue → <code>[4,5,3,2,1]</code>; rotate 2 (n−k) → <code>[3,2,1,4,5]</code> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span><code>k = 0</code> → unchanged; <code>k = n</code> → full reverse (rotation loop runs zero times); <code>k &gt; n</code> → invalid, guard it.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>This tests fluency with both ADTs: stack for LIFO reversal, queue rotation for re-ordering. State the 3-step plan before coding.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Stack reverses the first k; rotation restores order of the rest.</li><li>O(n) time, O(k) extra space.</li></ul>`
  }

});

/* ════════════════════════ BINARY SEARCH ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "35": {
    id: "LC #35", title: "Search Insert Position", difficulty: "Easy", topic: "Binary Search · Lower Bound",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Binary search</span>
        <span class="ans-chip">Lower bound</span>
        <span class="ans-chip">Time O(log n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return the index of <code>target</code> in a sorted array, or the index where it would be inserted to keep the array sorted. This is the classic <strong>lower-bound</strong> binary search.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int searchInsert(int[] nums, int target) {
    int lo = 0, hi = nums.length;          <span class="cc">// hi = n (insertion can be at end)</span>
    while (lo &lt; hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] &lt; target) lo = mid + 1;
        else hi = mid;                     <span class="cc">// keep mid as a candidate</span>
    }
    return lo;                             <span class="cc">// first index with nums[i] &gt;= target</span>
}</pre>
      <p>This "<code>lo &lt; hi</code>, <code>hi = mid</code>" template returns the first position where <code>nums[i] &gt;= target</code> — exactly the insert position.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(log n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,3,5,6], target=5</code> → returns 2 (found). <code>target=2</code> → returns 1 (insert between 1 and 3). <code>target=7</code> → returns 4 (append) ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Template note</span>Initialize <code>hi = n</code> (not <code>n−1</code>) so the answer can be the end. Memorize this lower-bound shape — it underlies many search problems.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Lower bound = first index with value ≥ target.</li><li><code>hi = mid</code> (not <code>mid−1</code>) keeps candidates in range.</li></ul>`
  },

  "268": {
    id: "LC #268", title: "Missing Number", difficulty: "Easy", topic: "Arrays · Math / XOR",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Sum formula</span>
        <span class="ans-chip">XOR</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>An array contains <code>n</code> distinct numbers from <code>[0, n]</code> — exactly one is missing. Find it. Several O(n)/O(1) approaches exist; sum-formula and XOR are the cleanest.</p>

      <h3>Approaches</h3>
      <h4>1) Gauss sum</h4>
      <pre class="code-block">public int missingNumber(int[] nums) {
    int n = nums.length;
    int expected = n * (n + 1) / 2;        <span class="cc">// sum of 0..n</span>
    int actual = 0;
    for (int x : nums) actual += x;
    return expected - actual;
}</pre>
      <h4>2) XOR (overflow-safe)</h4>
      <pre class="code-block">public int missingNumber(int[] nums) {
    int xor = nums.length;                  <span class="cc">// start with n</span>
    for (int i = 0; i &lt; nums.length; i++) {
        xor ^= i ^ nums[i];                 <span class="cc">// index ^ value cancels pairs</span>
    }
    return xor;                             <span class="cc">// leftover = missing</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th><th>Note</th></tr></thead>
      <tbody>
        <tr><td>Sort + scan</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(1)</span></td><td>Slower</td></tr>
        <tr><td>Gauss sum</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td><td>Watch overflow (use long)</td></tr>
        <tr><td><strong>XOR</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td><td>No overflow</td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[3,0,1]</code>, n=3: expected 6, actual 4 → missing <strong>2</strong>. XOR: 3^0^3^1^0^2^... pairs cancel → 2 ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>XOR avoids the overflow risk of the sum formula and signals bit-manipulation fluency. Both are O(1) space.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Sum of 0..n minus actual sum = missing.</li><li>XOR of indices and values cancels all present numbers.</li></ul>`
  },

  "34": {
    id: "LC #34", title: "Find First and Last Position", difficulty: "Medium", topic: "Binary Search · Bounds",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Binary search</span>
        <span class="ans-chip">Lower + upper bound</span>
        <span class="ans-chip">Time O(log n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the first and last index of <code>target</code> in a sorted array (with duplicates), or <code>[-1,-1]</code> if absent. Run binary search twice: once biased left (first occurrence), once biased right (last occurrence).</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int[] searchRange(int[] nums, int target) {
    int left = lowerBound(nums, target);
    if (left == nums.length || nums[left] != target) return new int[]{-1, -1};
    int right = lowerBound(nums, target + 1) - 1; <span class="cc">// first index &gt; target, minus 1</span>
    return new int[]{left, right};
}
private int lowerBound(int[] nums, int target) {
    int lo = 0, hi = nums.length;
    while (lo &lt; hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] &lt; target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}</pre>
      <p>Cleverly, the last occurrence of <code>target</code> is <code>lowerBound(target + 1) − 1</code> — one before the first element strictly greater than target.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(log n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[5,7,7,8,8,10], target=8</code>: lowerBound(8)=3, lowerBound(9)−1=5−1=4 → <code>[3,4]</code>. target=6 → not found → <code>[-1,-1]</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Doing a normal binary search and linearly expanding to both sides — O(n) in the worst case (all duplicates). Two bound searches keep it O(log n).</div>

      <h3>Key Takeaways</h3>
      <ul><li>First occurrence = lowerBound(target); last = lowerBound(target+1) − 1.</li><li>Reusing one lowerBound helper keeps the code clean.</li></ul>`
  },

  "162": {
    id: "LC #162", title: "Find Peak Element", difficulty: "Medium", topic: "Binary Search · On Slope",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Binary search</span>
        <span class="ans-chip">Slope direction</span>
        <span class="ans-chip">Time O(log n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find any peak (an element greater than both neighbors); <code>nums[-1] = nums[n] = −∞</code>. Despite no global sortedness, binary search works by always moving toward the <strong>higher neighbor</strong> — a peak must exist that way.</p>

      <h3>Key Insight</h3>
      <p>If <code>nums[mid] &lt; nums[mid+1]</code>, an ascending slope guarantees a peak to the right, so go right. Otherwise a peak is at <code>mid</code> or to the left.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int findPeakElement(int[] nums) {
    int lo = 0, hi = nums.length - 1;
    while (lo &lt; hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] &lt; nums[mid + 1]) lo = mid + 1; <span class="cc">// climb right</span>
        else hi = mid;                               <span class="cc">// peak at mid or left</span>
    }
    return lo;                                        <span class="cc">// lo == hi == a peak</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Linear scan</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Binary search on slope</strong></td><td><span class="ans-cx">O(log n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,1,3,5,6,4]</code>: mid=3 (3)&lt;5 → go right; converges to index 5 (value 6, a peak) ✓ (index 1 is also valid).</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Why it works without sorting</span>Moving uphill can't skip all peaks: the boundary's −∞ guarantees the ascending side eventually turns down, producing a peak.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Walk toward the larger neighbor; a peak is guaranteed.</li><li>O(log n) even though the array isn't sorted.</li></ul>`
  },

  "153": {
    id: "LC #153", title: "Find Minimum in Rotated Sorted Array", difficulty: "Medium", topic: "Binary Search · Rotated",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Binary search</span>
        <span class="ans-chip">Rotated array</span>
        <span class="ans-chip">Time O(log n)</span>
      </div>

      <h3>Overview</h3>
      <p>A sorted array was rotated; find the minimum (the rotation pivot) in O(log n). Compare <code>mid</code> with the <strong>rightmost</strong> element to decide which half holds the minimum.</p>

      <h3>Key Insight</h3>
      <p>If <code>nums[mid] &gt; nums[hi]</code>, the minimum lies to the right of <code>mid</code>; otherwise it's at <code>mid</code> or to its left. (Comparing to <code>hi</code>, not <code>lo</code>, avoids ambiguity.)</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int findMin(int[] nums) {
    int lo = 0, hi = nums.length - 1;
    while (lo &lt; hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] &gt; nums[hi]) lo = mid + 1; <span class="cc">// min is to the right</span>
        else hi = mid;                          <span class="cc">// min is mid or left</span>
    }
    return nums[lo];
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(log n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[4,5,6,7,0,1,2]</code>: mid=3 (7)&gt;2 → lo=4; mid=5 (1)&lt;2 → hi=5; mid=4 (0)&lt;1 → hi=4; lo==hi=4 → <strong>0</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Comparing <code>nums[mid]</code> to <code>nums[lo]</code> — ambiguous when the subarray is already sorted. Compare to <code>nums[hi]</code> for a clean decision. (Duplicates → LC 154 needs an extra <code>hi--</code> case.)</div>

      <h3>Key Takeaways</h3>
      <ul><li>Compare mid to the right end to locate the unsorted (pivot) half.</li><li>No duplicates → strictly O(log n).</li></ul>`
  },

  "33": {
    id: "LC #33", title: "Search in Rotated Sorted Array", difficulty: "Medium", topic: "Binary Search · Rotated",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Binary search</span>
        <span class="ans-chip">Identify sorted half</span>
        <span class="ans-chip">Time O(log n)</span>
      </div>

      <h3>Overview</h3>
      <p>Search a target in a rotated sorted array of distinct values in O(log n). At each step, one half (left of mid or right of mid) is guaranteed sorted — check whether the target lies within that sorted half to decide where to go.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int search(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo &lt;= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[lo] &lt;= nums[mid]) {              <span class="cc">// left half sorted</span>
            if (nums[lo] &lt;= target &amp;&amp; target &lt; nums[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {                                  <span class="cc">// right half sorted</span>
            if (nums[mid] &lt; target &amp;&amp; target &lt;= nums[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(log n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[4,5,6,7,0,1,2], target=0</code>: mid=3(7), left sorted [4..7], 0 not in it → lo=4; mid=5(1), left sorted [0,1], 0 in [0,1)? yes → hi=4; mid=4(0) → found index <strong>4</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Boundary comparisons — use <code>nums[lo] &lt;= nums[mid]</code> (with <code>&lt;=</code>) to correctly classify the sorted half when <code>lo == mid</code>. Off-by-one here is the usual bug.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Alternative</span>Find the pivot (LC 153) first, then binary-search the correct segment — two clean log-n searches, easier to reason about.</div>

      <h3>Key Takeaways</h3>
      <ul><li>One half is always sorted; test if target is inside it.</li><li>Distinct values → guaranteed O(log n).</li></ul>`
  },

  "81": {
    id: "LC #81", title: "Search in Rotated Sorted Array II", difficulty: "Medium", topic: "Binary Search · Rotated + Dups",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Binary search</span>
        <span class="ans-chip">Duplicates</span>
        <span class="ans-chip">Worst O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Like LC 33 but the array may contain <strong>duplicates</strong>, which can break the "one half is sorted" test (e.g. <code>nums[lo] == nums[mid] == nums[hi]</code>). Handle that ambiguity by shrinking both ends.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public boolean search(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo &lt;= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return true;
        if (nums[lo] == nums[mid] &amp;&amp; nums[mid] == nums[hi]) {
            lo++; hi--;                          <span class="cc">// ambiguous -&gt; shrink both</span>
        } else if (nums[lo] &lt;= nums[mid]) {       <span class="cc">// left sorted</span>
            if (nums[lo] &lt;= target &amp;&amp; target &lt; nums[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {                                  <span class="cc">// right sorted</span>
            if (nums[mid] &lt; target &amp;&amp; target &lt;= nums[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return false;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Case</th><th>Time</th></tr></thead>
      <tbody>
        <tr><td>Average</td><td><span class="ans-cx">O(log n)</span></td></tr>
        <tr><td>Worst (many dups, e.g. all equal)</td><td><span class="ans-cx">O(n)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[2,5,6,0,0,1,2], target=0</code>: works like LC 33. For <code>[1,0,1,1,1]</code>, target 0: lo=mid=hi=1 case triggers <code>lo++,hi--</code> until the 0 is isolated → true ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Why O(n) worst case</span>When ends and mid are equal you can't tell which half is sorted, so you discard only one element each side. Unavoidable with duplicates.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Duplicates can make the sorted-half test ambiguous → shrink both ends.</li><li>Average O(log n), worst O(n).</li></ul>`
  },

  "875": {
    id: "LC #875", title: "Koko Eating Bananas", difficulty: "Medium", topic: "Binary Search · On Answer",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Binary search on answer</span>
        <span class="ans-chip">Feasibility check</span>
        <span class="ans-chip">Time O(n log M)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the minimum eating speed <code>k</code> (bananas/hour) so Koko finishes all piles within <code>h</code> hours. The answer isn't in the array — you <strong>binary-search the answer range</strong> <code>[1, max(piles)]</code>, testing feasibility for each candidate speed.</p>

      <h3>Key Insight (search on answer)</h3>
      <p>Feasibility is <strong>monotonic</strong>: if speed <code>k</code> works, any larger speed also works. So binary-search for the smallest feasible <code>k</code>. Hours needed at speed <code>k</code> = <code>Σ ceil(pile / k)</code>.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int minEatingSpeed(int[] piles, int h) {
    int lo = 1, hi = 0;
    for (int p : piles) hi = Math.max(hi, p);   <span class="cc">// max speed ever needed</span>
    while (lo &lt; hi) {
        int mid = lo + (hi - lo) / 2;
        if (canFinish(piles, h, mid)) hi = mid;  <span class="cc">// feasible -&gt; try slower</span>
        else lo = mid + 1;                       <span class="cc">// too slow -&gt; speed up</span>
    }
    return lo;
}
private boolean canFinish(int[] piles, int h, int k) {
    long hours = 0;
    for (int p : piles) hours += (p + k - 1) / k; <span class="cc">// ceil(p/k)</span>
    return hours &lt;= h;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n log M)</span>, M = max pile</td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>piles=[3,6,7,11], h=8</code>: search [1,11]; mid 6 feasible (hours 1+1+2+2=6≤8) → try slower; converges to <strong>4</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Pattern: binary search on answer</span>Recognize it when you're asked for a min/max value satisfying a monotonic feasibility predicate. Same template as LC 1011, 410, 1283.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Integer overflow in the hours sum — use <code>long</code>. And use ceil division <code>(p + k − 1)/k</code>, not floor.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Search the answer range, not the array; exploit monotonic feasibility.</li><li>Feasibility check is O(n); overall O(n log M).</li></ul>`
  },

  "1011": {
    id: "LC #1011", title: "Capacity to Ship Packages Within D Days", difficulty: "Medium", topic: "Binary Search · On Answer",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Binary search on answer</span>
        <span class="ans-chip">Min capacity</span>
        <span class="ans-chip">Time O(n log S)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the least ship capacity to ship all packages (in given order) within <code>days</code>. Binary-search the capacity range <code>[max(weight), sum(weight)]</code>; for each candidate, greedily count the days needed.</p>

      <h3>Bounds & Feasibility</h3>
      <ul>
        <li><strong>Lower bound</strong> = <code>max(weights)</code> (a ship must carry the heaviest single package).</li>
        <li><strong>Upper bound</strong> = <code>sum(weights)</code> (ship everything in one day).</li>
        <li>Feasibility: simulate loading; start a new day when the next package overflows capacity.</li>
      </ul>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int shipWithinDays(int[] weights, int days) {
    int lo = 0, hi = 0;
    for (int w : weights) { lo = Math.max(lo, w); hi += w; }
    while (lo &lt; hi) {
        int mid = lo + (hi - lo) / 2;
        if (canShip(weights, days, mid)) hi = mid; <span class="cc">// feasible -&gt; smaller capacity</span>
        else lo = mid + 1;
    }
    return lo;
}
private boolean canShip(int[] w, int days, int cap) {
    int needed = 1, load = 0;
    for (int x : w) {
        if (load + x &gt; cap) { needed++; load = 0; } <span class="cc">// new day</span>
        load += x;
    }
    return needed &lt;= days;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n log S)</span>, S = total weight</td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>weights=[1..10], days=5</code>: search [10,55]; converges to <strong>15</strong> (days: [1..5],[6,7],[8],[9],[10] = 5) ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Same family</span>Koko (875), Split Array Largest Sum (410), Allocate Pages, Painter's Partition — all "minimize the maximum load" via binary search on the answer.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Range = [max item, total]; feasibility = greedy day count.</li><li>Order-preserving partition into ≤ days groups.</li></ul>`
  },

  "410": {
    id: "LC #410", title: "Split Array Largest Sum", difficulty: "Hard", topic: "Binary Search · On Answer",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Binary search on answer</span>
        <span class="ans-chip">Minimize max subarray sum</span>
        <span class="ans-chip">Time O(n log S)</span>
      </div>

      <h3>Overview</h3>
      <p>Split the array into <code>k</code> contiguous subarrays to <strong>minimize the largest subarray sum</strong>. Binary-search that target maximum in <code>[max(nums), sum(nums)]</code>; feasibility = "can we split into ≤ k parts where each part's sum ≤ candidate?"</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int splitArray(int[] nums, int k) {
    int lo = 0, hi = 0;
    for (int x : nums) { lo = Math.max(lo, x); hi += x; }
    while (lo &lt; hi) {
        int mid = lo + (hi - lo) / 2;
        if (canSplit(nums, k, mid)) hi = mid;   <span class="cc">// feasible -&gt; tighten max</span>
        else lo = mid + 1;
    }
    return lo;
}
private boolean canSplit(int[] nums, int k, int maxSum) {
    int parts = 1, sum = 0;
    for (int x : nums) {
        if (sum + x &gt; maxSum) { parts++; sum = 0; } <span class="cc">// start a new part</span>
        sum += x;
    }
    return parts &lt;= k;
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>DP (dp[i][k])</td><td><span class="ans-cx">O(n²·k)</span></td><td><span class="ans-cx">O(n·k)</span></td></tr>
        <tr><td><strong>Binary search on answer</strong></td><td><span class="ans-cx">O(n log S)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>nums=[7,2,5,10,8], k=2</code>: range [10,32]; answer <strong>18</strong> → split [7,2,5] (14) and [10,8] (18) ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Identical to Allocate Pages / Painter's</span>"Minimize the maximum group" with contiguous partition is the canonical binary-search-on-answer template; the feasibility greedy is the same each time.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Minimize-the-max ⇒ binary search the max with a greedy feasibility count.</li><li>Far simpler than the O(n²k) DP.</li></ul>`
  },

  "gfg-allocate-pages": {
    id: "GFG", title: "Allocate Minimum Number of Pages", difficulty: "Hard", topic: "Binary Search · On Answer",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Binary search on answer</span>
        <span class="ans-chip">Minimize max pages</span>
        <span class="ans-chip">Time O(n log S)</span>
      </div>

      <h3>Overview</h3>
      <p>Given books with page counts and <code>m</code> students, allocate <strong>contiguous</strong> books so the maximum pages assigned to any student is minimized. Identical in structure to Split Array Largest Sum (LC 410).</p>

      <h3>Feasibility</h3>
      <p>For a candidate limit, greedily assign books to a student until adding the next would exceed the limit, then move to the next student. Feasible if students used ≤ m. If any single book exceeds the limit, infeasible.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int findPages(int[] pages, int m) {
    if (m &gt; pages.length) return -1;            <span class="cc">// can't give each a book</span>
    int lo = 0, hi = 0;
    for (int p : pages) { lo = Math.max(lo, p); hi += p; }
    while (lo &lt; hi) {
        int mid = lo + (hi - lo) / 2;
        if (canAllocate(pages, m, mid)) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}
private boolean canAllocate(int[] pages, int m, int limit) {
    int students = 1, sum = 0;
    for (int p : pages) {
        if (sum + p &gt; limit) { students++; sum = 0; }
        sum += p;
    }
    return students &lt;= m;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n log S)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>pages=[12,34,67,90], m=2</code> → answer <strong>113</strong>: [12,34,67]=113 and [90]=90, max 113 is minimal ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Edge case</span>If <code>m &gt; n</code>, allocation is impossible (return −1). Books must be assigned contiguously and in order.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Same template as LC 410 / Painter's Partition.</li><li>Range [max book, total]; greedy feasibility on student count.</li></ul>`
  },

  "ib-painters-partition": {
    id: "InterviewBit", title: "Painter's Partition Problem", difficulty: "Hard", topic: "Binary Search · On Answer",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Binary search on answer</span>
        <span class="ans-chip">Minimize max time</span>
        <span class="ans-chip">Time O(n log S)</span>
      </div>

      <h3>Overview</h3>
      <p><code>k</code> painters paint boards (each takes <code>length × unitTime</code>); a painter does <strong>contiguous</strong> boards. Minimize the total time = the maximum load among painters. Same binary-search-on-answer pattern as Allocate Pages / Split Array.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int paint(int k, int unitTime, int[] boards) {
    long lo = 0, hi = 0;
    for (int b : boards) { lo = Math.max(lo, b); hi += b; }
    while (lo &lt; hi) {
        long mid = lo + (hi - lo) / 2;
        if (painters(boards, mid) &lt;= k) hi = mid;
        else lo = mid + 1;
    }
    long total = (lo * unitTime) % 10000003;   <span class="cc">// IB asks for mod</span>
    return (int) total;
}
private int painters(int[] boards, long limit) {
    int count = 1; long sum = 0;
    for (int b : boards) {
        if (sum + b &gt; limit) { count++; sum = 0; }
        sum += b;
    }
    return count;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n log S)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>k=2, boards=[10,10,10,10]</code>: minimal max load = 20 ([10,10] each). Multiply by unitTime, apply mod ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">InterviewBit specifics</span>Use <code>long</code> (sums get large) and apply the required modulo only to the final answer. The core is identical to LC 410.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Binary search the max load; greedy painter count for feasibility.</li><li>Watch overflow and the modulo requirement.</li></ul>`
  },

  "4": {
    id: "LC #4", title: "Median of Two Sorted Arrays", difficulty: "Hard", topic: "Binary Search · Partition",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Binary search on partition</span>
        <span class="ans-chip">O(log(min(m,n)))</span>
        <span class="ans-chip">Hard</span>
      </div>

      <h3>Overview</h3>
      <p>Find the median of two sorted arrays in <strong>O(log(min(m, n)))</strong>. The idea: partition both arrays so the left halves together contain exactly half the elements and every left element ≤ every right element. Binary-search the partition on the smaller array.</p>

      <h3>Key Insight</h3>
      <p>Choose a cut <code>i</code> in the shorter array; the cut in the longer array is fixed at <code>j = (m + n + 1)/2 − i</code>. A valid partition satisfies <code>maxLeftA ≤ minRightB</code> and <code>maxLeftB ≤ minRightA</code>. Use ±∞ sentinels at the edges.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public double findMedianSortedArrays(int[] a, int[] b) {
    if (a.length &gt; b.length) return findMedianSortedArrays(b, a); <span class="cc">// search the shorter</span>
    int m = a.length, n = b.length, half = (m + n + 1) / 2;
    int lo = 0, hi = m;
    while (lo &lt;= hi) {
        int i = (lo + hi) / 2;          <span class="cc">// cut in a</span>
        int j = half - i;               <span class="cc">// cut in b</span>
        int aLeft  = (i == 0) ? Integer.MIN_VALUE : a[i - 1];
        int aRight = (i == m) ? Integer.MAX_VALUE : a[i];
        int bLeft  = (j == 0) ? Integer.MIN_VALUE : b[j - 1];
        int bRight = (j == n) ? Integer.MAX_VALUE : b[j];
        if (aLeft &lt;= bRight &amp;&amp; bLeft &lt;= aRight) {        <span class="cc">// valid partition</span>
            if (((m + n) &amp; 1) == 1) return Math.max(aLeft, bLeft);
            return (Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2.0;
        } else if (aLeft &gt; bRight) hi = i - 1;          <span class="cc">// move cut left</span>
        else lo = i + 1;                                <span class="cc">// move cut right</span>
    }
    throw new IllegalArgumentException();
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Merge then pick</td><td><span class="ans-cx">O(m+n)</span></td><td><span class="ans-cx">O(m+n)</span></td></tr>
        <tr><td><strong>Partition binary search</strong></td><td><span class="ans-cx">O(log min(m,n))</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>a=[1,3], b=[2]</code>: half=2; try i=1 → j=1; aLeft=1,aRight=3,bLeft=2,bRight=∞; valid (1≤∞, 2≤3); odd total → max(1,2)=<strong>2.0</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Not searching the shorter array → out-of-range cuts. (2) Forgetting ±∞ sentinels at boundaries. (3) Wrong parity handling for the median.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>If O(log) is too risky under time pressure, state the O(m+n) merge approach first, then attempt the partition method — partial credit for correctness.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Binary-search a partition so left halves hold exactly half the elements.</li><li>Validity: <code>maxLeft ≤ minRight</code> across both arrays.</li></ul>`
  }

});

/* ════════════════════════ LINKED LIST ════════════════════════
 * All solutions assume:  class ListNode { int val; ListNode next; }
 * ============================================================ */
Object.assign(window.DSA_ANSWERS, {

  "83": {
    id: "LC #83", title: "Remove Duplicates from Sorted List", difficulty: "Easy", topic: "Linked List · Pointers",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Single pass</span>
        <span class="ans-chip">Pointer relinking</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Delete duplicates from a sorted linked list so each value appears once. Since the list is sorted, duplicates are adjacent — compare each node with its next and skip over equal values.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public ListNode deleteDuplicates(ListNode head) {
    ListNode cur = head;
    while (cur != null &amp;&amp; cur.next != null) {
        if (cur.val == cur.next.val) {
            cur.next = cur.next.next;   <span class="cc">// unlink duplicate</span>
        } else {
            cur = cur.next;             <span class="cc">// advance only when distinct</span>
        }
    }
    return head;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>1→1→2→3→3</code> → skip second 1 → <code>1→2→3→3</code> → skip second 3 → <code>1→2→3</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Advancing <code>cur</code> after unlinking — you'd skip checking the new <code>cur.next</code> against <code>cur</code>. Only advance when values differ.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Variant</span>LC 82 removes <em>all</em> nodes that have duplicates (keep only uniques) → needs a dummy head and look-ahead.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Sorted ⇒ duplicates adjacent ⇒ relink <code>cur.next</code>.</li><li>Don't advance the pointer when you delete.</li></ul>`
  },

  "206": {
    id: "LC #206", title: "Reverse Linked List", difficulty: "Easy", topic: "Linked List · Reversal",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Iterative reversal</span>
        <span class="ans-chip">3 pointers</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Reverse a singly linked list. The iterative three-pointer technique (<code>prev</code>, <code>cur</code>, <code>next</code>) is the must-know building block for many list problems.</p>

      <h3>Java Code (Optimal — iterative)</h3>
      <pre class="code-block">public ListNode reverseList(ListNode head) {
    ListNode prev = null, cur = head;
    while (cur != null) {
        ListNode next = cur.next; <span class="cc">// save next</span>
        cur.next = prev;          <span class="cc">// reverse the link</span>
        prev = cur;               <span class="cc">// advance prev</span>
        cur = next;               <span class="cc">// advance cur</span>
    }
    return prev;                  <span class="cc">// new head</span>
}</pre>

      <h4>Recursive (O(n) stack)</h4>
      <pre class="code-block">public ListNode reverseList(ListNode head) {
    if (head == null || head.next == null) return head;
    ListNode newHead = reverseList(head.next);
    head.next.next = head;   <span class="cc">// make the next node point back</span>
    head.next = null;
    return newHead;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Iterative</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td>Recursive</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span> stack</td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>1→2→3→null</code>: prev=null,cur=1 → 1→null; prev=1,cur=2 → 2→1; prev=2,cur=3 → 3→2→1 → return 3 → <code>3→2→1</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Forgetting to save <code>next</code> before rewiring <code>cur.next</code> — you'd lose the rest of the list.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Iterative reversal: save next, flip link, advance both pointers.</li><li>Prefer iterative (O(1) space) for long lists.</li></ul>`
  },

  "141": {
    id: "LC #141", title: "Linked List Cycle", difficulty: "Easy", topic: "Linked List · Floyd's Cycle",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Floyd's tortoise & hare</span>
        <span class="ans-chip">Fast/slow</span>
        <span class="ans-chip">O(1) space</span>
      </div>

      <h3>Overview</h3>
      <p>Detect whether a linked list has a cycle. <strong>Floyd's algorithm</strong>: a slow pointer (1 step) and a fast pointer (2 steps). If they ever meet, there's a cycle; if fast reaches null, there isn't.</p>

      <h3>Why It Works</h3>
      <p>Inside a cycle, the fast pointer gains one position on the slow pointer each step, so it must eventually land on it (modular catch-up). Without a cycle, fast hits the end.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null &amp;&amp; fast.next != null) {
        slow = slow.next;          <span class="cc">// 1 step</span>
        fast = fast.next.next;     <span class="cc">// 2 steps</span>
        if (slow == fast) return true; <span class="cc">// pointers met -&gt; cycle</span>
    }
    return false;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>HashSet of visited</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td><strong>Floyd's</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>3→2→0→-4→(back to 2)</code>: slow/fast advance; fast laps and meets slow inside the cycle → <strong>true</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Follow-up (LC 142)</span>To find the cycle's <em>start</em>: after they meet, move one pointer to head and advance both one step at a time; they meet at the cycle entry.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Fast/slow pointers detect cycles in O(1) space.</li><li>Meeting ⇒ cycle; fast hitting null ⇒ no cycle.</li></ul>`
  },

  "876": {
    id: "LC #876", title: "Middle of the Linked List", difficulty: "Easy", topic: "Linked List · Fast/Slow",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Fast/slow pointers</span>
        <span class="ans-chip">Single pass</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return the middle node (second middle if even length). Fast/slow pointers find it in one pass without counting length first.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public ListNode middleNode(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null &amp;&amp; fast.next != null) {
        slow = slow.next;          <span class="cc">// 1 step</span>
        fast = fast.next.next;     <span class="cc">// 2 steps</span>
    }
    return slow;                   <span class="cc">// fast at end -&gt; slow at middle</span>
}</pre>
      <p>When fast reaches the end, slow has covered exactly half the distance — the middle.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>1→2→3→4→5</code>: slow ends at 3. <code>1→2→3→4→5→6</code>: slow ends at 4 (second middle) ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Reusable</span>This "find middle" is the first step in merge-sorting a list, reordering (LC 143), and palindrome checking (LC 234). For the <em>first</em> middle on even length, start <code>fast = head.next</code>.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Fast moves 2×; when it ends, slow is at the middle.</li><li>Pointer start position decides first vs second middle.</li></ul>`
  },

  "19": {
    id: "LC #19", title: "Remove Nth Node From End", difficulty: "Medium", topic: "Linked List · Two Pointers",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Gap two pointers</span>
        <span class="ans-chip">Dummy head</span>
        <span class="ans-chip">Single pass</span>
      </div>

      <h3>Overview</h3>
      <p>Remove the n-th node from the end in one pass. Advance a <code>fast</code> pointer <code>n</code> steps ahead, then move <code>fast</code> and <code>slow</code> together until fast reaches the end — <code>slow</code> now sits just before the target.</p>

      <h3>Why a Dummy Node</h3>
      <p>A dummy node before head gracefully handles removing the head itself (when n equals the list length), avoiding a special case.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0);
    dummy.next = head;
    ListNode fast = dummy, slow = dummy;
    for (int i = 0; i &lt; n; i++) fast = fast.next; <span class="cc">// create n-gap</span>
    while (fast.next != null) {                    <span class="cc">// move together</span>
        fast = fast.next;
        slow = slow.next;
    }
    slow.next = slow.next.next;                     <span class="cc">// unlink target</span>
    return dummy.next;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span> single pass</td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>1→2→3→4→5, n=2</code>: fast advances to node 2; both move until fast at 5; slow at 3 → unlink 4 → <code>1→2→3→5</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) No dummy → crashes when removing the head. (2) Off-by-one in the gap (advance n, not n+1, from dummy). </div>

      <h3>Key Takeaways</h3>
      <ul><li>n-gap two pointers find the predecessor of the target in one pass.</li><li>Dummy head removes the edge case of deleting the first node.</li></ul>`
  },

  "138": {
    id: "LC #138", title: "Copy List with Random Pointer", difficulty: "Medium", topic: "Linked List · Hashing / Interleave",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Deep copy</span>
        <span class="ans-chip">HashMap or interleave</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Deep-copy a list where each node has a <code>next</code> and a <code>random</code> pointer (to any node or null). The challenge: when copying a node you may not have created the target of its <code>random</code> yet.</p>

      <h3>Approach A — HashMap (old → new)</h3>
      <pre class="code-block">public Node copyRandomList(Node head) {
    Map&lt;Node, Node&gt; map = new HashMap&lt;&gt;();
    for (Node cur = head; cur != null; cur = cur.next)
        map.put(cur, new Node(cur.val));          <span class="cc">// clone nodes</span>
    for (Node cur = head; cur != null; cur = cur.next) {
        map.get(cur).next   = map.get(cur.next);  <span class="cc">// wire next</span>
        map.get(cur).random = map.get(cur.random);<span class="cc">// wire random</span>
    }
    return map.get(head);
}</pre>

      <h3>Approach B — Interleave (O(1) space)</h3>
      <pre class="code-block">public Node copyRandomList(Node head) {
    if (head == null) return null;
    for (Node cur = head; cur != null; cur = cur.next.next) {
        Node copy = new Node(cur.val);
        copy.next = cur.next; cur.next = copy;     <span class="cc">// A-&gt;A'-&gt;B-&gt;B'...</span>
    }
    for (Node cur = head; cur != null; cur = cur.next.next)
        if (cur.random != null) cur.next.random = cur.random.next; <span class="cc">// set copy random</span>
    Node dummy = new Node(0), tail = dummy;
    for (Node cur = head; cur != null; cur = cur.next) {
        tail.next = cur.next; tail = tail.next;    <span class="cc">// detach copies</span>
        cur.next = cur.next.next;                  <span class="cc">// restore original</span>
    }
    return dummy.next;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>HashMap</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td>Interleave</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>Lead with the HashMap version (clear, fast to write), then offer interleaving as the O(1)-space optimization. Interleaving relies on <code>copy.random = original.random.next</code>.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>In interleaving, forgetting to <strong>restore</strong> the original list's <code>next</code> pointers when detaching the copies.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Map old→new to resolve random pointers after cloning.</li><li>Interleaving copies achieves O(1) extra space.</li></ul>`
  },

  "2": {
    id: "LC #2", title: "Add Two Numbers", difficulty: "Medium", topic: "Linked List · Math",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Digit-by-digit</span>
        <span class="ans-chip">Carry</span>
        <span class="ans-chip">Dummy head</span>
      </div>

      <h3>Overview</h3>
      <p>Two numbers are stored as linked lists with digits in <strong>reverse</strong> order (least significant first). Add them and return the sum as a list. Reverse order is convenient — you add from the head and carry forward naturally.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
    ListNode dummy = new ListNode(0), cur = dummy;
    int carry = 0;
    while (l1 != null || l2 != null || carry != 0) {
        int sum = carry;
        if (l1 != null) { sum += l1.val; l1 = l1.next; }
        if (l2 != null) { sum += l2.val; l2 = l2.next; }
        carry = sum / 10;                    <span class="cc">// carry to next digit</span>
        cur.next = new ListNode(sum % 10);   <span class="cc">// current digit</span>
        cur = cur.next;
    }
    return dummy.next;
}</pre>
      <p>The single loop condition <code>l1 || l2 || carry</code> elegantly handles different lengths and a final carry (e.g. 5+5 = 10).</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(max(m,n))</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(max(m,n))</span> output</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>(2→4→3) + (5→6→4)</code> = 342+465=807 → <code>7→0→8</code> ✓ (digit sums 7, 10→0 carry1, 3+4+1=8).</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Forgetting the final carry — without <code>carry != 0</code> in the loop, <code>(5)+(5)</code> wrongly returns <code>0</code> instead of <code>0→1</code>.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Variant</span>LC 445 stores digits in forward order → reverse the lists first, or use stacks.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Add digit by digit with a carry; dummy head simplifies building.</li><li>Loop while either list or the carry remains.</li></ul>`
  },

  "202": {
    id: "LC #202", title: "Happy Number", difficulty: "Easy", topic: "Math · Floyd's Cycle",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Cycle detection</span>
        <span class="ans-chip">Digit-square sum</span>
        <span class="ans-chip">O(1) space</span>
      </div>

      <h3>Overview</h3>
      <p>Repeatedly replace a number with the sum of the squares of its digits. It's "happy" if this reaches 1; otherwise it loops forever. Detecting that loop is a <strong>cycle detection</strong> problem — Floyd's fast/slow works on the number sequence.</p>

      <h3>Java Code (Optimal — Floyd's)</h3>
      <pre class="code-block">public boolean isHappy(int n) {
    int slow = n, fast = next(n);
    while (fast != 1 &amp;&amp; slow != fast) {
        slow = next(slow);          <span class="cc">// 1 step</span>
        fast = next(next(fast));    <span class="cc">// 2 steps</span>
    }
    return fast == 1;
}
private int next(int n) {
    int sum = 0;
    while (n &gt; 0) { int d = n % 10; sum += d * d; n /= 10; }
    return sum;
}</pre>
      <p>Alternatively, a HashSet of seen values detects repetition (O(log n) space). Floyd's reaches O(1) space.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(log n)</span> per step, bounded steps</td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> (Floyd's)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>19 → 1+81=82 → 64+4=68 → 36+64=100 → 1 → <strong>happy</strong> ✓. 2 → 4 → 16 → 37 → ... cycles without 1 → false.</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Why this is in Linked List</span>The sequence of numbers is an implicit linked list; "unhappy" means a cycle. Floyd's detects it exactly as in LC 141.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Model the transform sequence as a linked list; detect cycles.</li><li>Floyd's gives O(1) space vs HashSet's O(log n).</li></ul>`
  },

  "92": {
    id: "LC #92", title: "Reverse Linked List II", difficulty: "Medium", topic: "Linked List · Partial Reversal",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">In-place reversal</span>
        <span class="ans-chip">Dummy head</span>
        <span class="ans-chip">Single pass</span>
      </div>

      <h3>Overview</h3>
      <p>Reverse the sublist from position <code>left</code> to <code>right</code> (1-indexed) in one pass. Walk to the node before <code>left</code>, then repeatedly move the node after the current one to the front of the reversed section (head-insertion).</p>

      <h3>Java Code (Optimal — head insertion)</h3>
      <pre class="code-block">public ListNode reverseBetween(ListNode head, int left, int right) {
    ListNode dummy = new ListNode(0);
    dummy.next = head;
    ListNode prev = dummy;
    for (int i = 0; i &lt; left - 1; i++) prev = prev.next; <span class="cc">// node before sublist</span>
    ListNode cur = prev.next;
    for (int i = 0; i &lt; right - left; i++) {
        ListNode move = cur.next;       <span class="cc">// node to relocate</span>
        cur.next = move.next;           <span class="cc">// detach it</span>
        move.next = prev.next;          <span class="cc">// insert at front of section</span>
        prev.next = move;
    }
    return dummy.next;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>1→2→3→4→5, left=2, right=4</code>: prev=1, cur=2; move 3 to front (2 after 3), move 4 → <code>1→4→3→2→5</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) No dummy → painful when <code>left == 1</code>. (2) Loop count is <code>right − left</code> head-insertions, an easy off-by-one.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Head-insert the successor <code>right − left</code> times into the section.</li><li>Dummy node handles reversing from the head.</li></ul>`
  },

  "234": {
    id: "LC #234", title: "Palindrome Linked List", difficulty: "Easy", topic: "Linked List · Fast/Slow + Reverse",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Find middle + reverse</span>
        <span class="ans-chip">O(1) space</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Check if a list reads the same forwards and backwards in O(n) time and O(1) space. Find the middle (fast/slow), reverse the second half, then compare the two halves node by node.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public boolean isPalindrome(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null &amp;&amp; fast.next != null) { <span class="cc">// find middle</span>
        slow = slow.next; fast = fast.next.next;
    }
    ListNode second = reverse(slow);            <span class="cc">// reverse 2nd half</span>
    ListNode p1 = head, p2 = second;
    boolean ok = true;
    while (p2 != null) {                         <span class="cc">// compare halves</span>
        if (p1.val != p2.val) { ok = false; break; }
        p1 = p1.next; p2 = p2.next;
    }
    reverse(second);                            <span class="cc">// optional: restore list</span>
    return ok;
}
private ListNode reverse(ListNode h) {
    ListNode prev = null;
    while (h != null) { ListNode n = h.next; h.next = prev; prev = h; h = n; }
    return prev;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Copy to array + two pointers</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td><strong>Middle + reverse half</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>1→2→2→1</code>: middle at 3rd node, reverse 2nd half <code>1→2</code>, compare 1=1, 2=2 → <strong>true</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>Mention you can restore the list by reversing the second half back — good etiquette if the caller reuses the list.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Combine find-middle + reverse-half + compare for O(1) space.</li><li>Comparing until the shorter (second) half ends handles odd lengths.</li></ul>`
  },

  "143": {
    id: "LC #143", title: "Reorder List", difficulty: "Medium", topic: "Linked List · Middle + Reverse + Merge",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Three sub-routines</span>
        <span class="ans-chip">O(1) space</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Reorder <code>L0→L1→…→Ln</code> into <code>L0→Ln→L1→Ln-1→…</code> in place. Compose three classic routines: <strong>find middle</strong>, <strong>reverse the second half</strong>, <strong>merge the two halves alternately</strong>.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public void reorderList(ListNode head) {
    if (head == null || head.next == null) return;
    <span class="cc">// 1) find middle</span>
    ListNode slow = head, fast = head;
    while (fast.next != null &amp;&amp; fast.next.next != null) {
        slow = slow.next; fast = fast.next.next;
    }
    <span class="cc">// 2) reverse second half</span>
    ListNode second = slow.next; slow.next = null;
    ListNode prev = null;
    while (second != null) { ListNode n = second.next; second.next = prev; prev = second; second = n; }
    <span class="cc">// 3) merge two halves alternately</span>
    ListNode first = head; second = prev;
    while (second != null) {
        ListNode t1 = first.next, t2 = second.next;
        first.next = second; second.next = t1;
        first = t1; second = t2;
    }
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>1→2→3→4</code>: middle split → <code>1→2</code> and <code>3→4</code>; reverse 2nd → <code>4→3</code>; merge → <code>1→4→2→3</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Not cutting the first half (<code>slow.next = null</code>) → the merge loops or duplicates nodes.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Decompose into middle + reverse + alternate-merge.</li><li>Cut the list at the middle before merging.</li></ul>`
  },

  "23": {
    id: "LC #23", title: "Merge k Sorted Lists", difficulty: "Hard", topic: "Linked List · Heap / Divide & Conquer",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Min-heap</span>
        <span class="ans-chip">Divide & conquer</span>
        <span class="ans-chip">Time O(N log k)</span>
      </div>

      <h3>Overview</h3>
      <p>Merge <code>k</code> sorted lists into one. Two optimal strategies: a <strong>min-heap</strong> of the current heads, or <strong>divide &amp; conquer</strong> pairwise merging. Both run in O(N log k) where N is the total number of nodes.</p>

      <h3>Java Code (Optimal — min-heap)</h3>
      <pre class="code-block">public ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue&lt;ListNode&gt; pq = new PriorityQueue&lt;&gt;((a, b) -&gt; a.val - b.val);
    for (ListNode l : lists) if (l != null) pq.offer(l);   <span class="cc">// seed heads</span>
    ListNode dummy = new ListNode(0), tail = dummy;
    while (!pq.isEmpty()) {
        ListNode node = pq.poll();        <span class="cc">// smallest current head</span>
        tail.next = node; tail = node;
        if (node.next != null) pq.offer(node.next); <span class="cc">// push its successor</span>
    }
    return dummy.next;
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Merge one by one</td><td><span class="ans-cx">O(N·k)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td>Min-heap</td><td><span class="ans-cx">O(N log k)</span></td><td><span class="ans-cx">O(k)</span></td></tr>
        <tr><td>Divide &amp; conquer</td><td><span class="ans-cx">O(N log k)</span></td><td><span class="ans-cx">O(log k)</span> stack</td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[1,4,5],[1,3,4],[2,6]]</code>: heap pops 1,1,2,3,4,4,5,6 → <code>1→1→2→3→4→4→5→6</code> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Divide & conquer alternative</span>Pair up lists and merge two at a time, halving the count each round (log k rounds, O(N) per round). Avoids the heap and is often slightly faster.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Edge cases</span>Empty array, or lists containing nulls — guard with <code>if (l != null)</code> before offering.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Heap keeps the k current heads ordered → O(N log k).</li><li>Divide &amp; conquer achieves the same bound without a heap.</li></ul>`
  },

  "25": {
    id: "LC #25", title: "Reverse Nodes in k-Group", difficulty: "Hard", topic: "Linked List · Group Reversal",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Group reversal</span>
        <span class="ans-chip">Dummy head</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Reverse the list in groups of <code>k</code>; a trailing group smaller than <code>k</code> stays as-is. Process group by group: verify k nodes remain, reverse that block, and reconnect.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public ListNode reverseKGroup(ListNode head, int k) {
    ListNode dummy = new ListNode(0);
    dummy.next = head;
    ListNode groupPrev = dummy;
    while (true) {
        ListNode kth = groupPrev;                 <span class="cc">// find k-th node of group</span>
        for (int i = 0; i &lt; k &amp;&amp; kth != null; i++) kth = kth.next;
        if (kth == null) break;                   <span class="cc">// fewer than k -&gt; stop</span>
        ListNode groupNext = kth.next;
        <span class="cc">// reverse this group</span>
        ListNode prev = groupNext, cur = groupPrev.next;
        while (cur != groupNext) {
            ListNode n = cur.next; cur.next = prev; prev = cur; cur = n;
        }
        ListNode tmp = groupPrev.next;            <span class="cc">// old head = new tail</span>
        groupPrev.next = kth;                     <span class="cc">// connect to new head</span>
        groupPrev = tmp;                          <span class="cc">// advance to next group</span>
    }
    return dummy.next;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> iterative</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>1→2→3→4→5, k=2</code>: reverse [1,2]→2→1, reverse [3,4]→4→3, [5] stays → <code>2→1→4→3→5</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Reversing an incomplete final group. (2) Losing the link between consecutive groups — track <code>groupPrev</code> and the new tail carefully.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>This combines counting + reversal + reconnection; walk through pointers on paper. It's a frequent senior-level question.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Confirm k nodes exist before reversing each group.</li><li>Reconnect <code>groupPrev → newHead</code> and advance to the old head (new tail).</li></ul>`
  }

});

/* ════════════════════════ GREEDY ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "55": {
    id: "LC #55", title: "Jump Game", difficulty: "Medium", topic: "Greedy · Reachability",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Greedy</span>
        <span class="ans-chip">Furthest reach</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Each element is a max jump length. Can you reach the last index from index 0? Track the <strong>furthest reachable index</strong> as you scan; if any index is beyond your reach, return false.</p>

      <h3>Java Code (Optimal — greedy)</h3>
      <pre class="code-block">public boolean canJump(int[] nums) {
    int reach = 0;
    for (int i = 0; i &lt; nums.length; i++) {
        if (i &gt; reach) return false;             <span class="cc">// gap we can't cross</span>
        reach = Math.max(reach, i + nums[i]);    <span class="cc">// extend furthest reach</span>
    }
    return true;
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>DP (reachable[i])</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td><strong>Greedy furthest reach</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[2,3,1,1,4]</code>: reach 0→2→4→… ≥ last → <strong>true</strong>. <code>[3,2,1,0,4]</code>: reach maxes at 3, index 4 &gt; 3 → false ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Why greedy works</span>If the furthest reach ever covers the end, the exact path doesn't matter — reachability is monotonic.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Maintain the furthest reachable index; fail if an index outruns it.</li><li>O(n)/O(1) beats the DP formulation.</li></ul>`
  },

  "45": {
    id: "LC #45", title: "Jump Game II", difficulty: "Medium", topic: "Greedy · BFS-like Levels",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Greedy</span>
        <span class="ans-chip">Implicit BFS levels</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the <strong>minimum</strong> number of jumps to reach the last index (a solution is guaranteed). Think of it as BFS by "levels": each jump expands the reachable window; count how many windows it takes.</p>

      <h3>How It Works</h3>
      <p>Track the end of the current jump's reach (<code>curEnd</code>) and the furthest reachable so far (<code>farthest</code>). When the scan reaches <code>curEnd</code>, you must take another jump — increment count and extend <code>curEnd</code> to <code>farthest</code>.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int jump(int[] nums) {
    int jumps = 0, curEnd = 0, farthest = 0;
    for (int i = 0; i &lt; nums.length - 1; i++) {   <span class="cc">// no jump needed at last index</span>
        farthest = Math.max(farthest, i + nums[i]);
        if (i == curEnd) {                        <span class="cc">// end of current level</span>
            jumps++;
            curEnd = farthest;                    <span class="cc">// next level boundary</span>
        }
    }
    return jumps;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[2,3,1,1,4]</code>: i=0 far=2, i==curEnd→jumps1,curEnd2; i=1 far=4; i=2 i==curEnd→jumps2,curEnd4 → reach end in <strong>2</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Looping to <code>n</code> instead of <code>n−1</code> → an extra phantom jump when already at the end.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Mental model</span>Each "level" is the set of indices reachable with the same jump count — this is BFS without an explicit queue.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Greedy level expansion = minimum jumps in O(n).</li><li>Increment jumps when the scan hits the current level's boundary.</li></ul>`
  },

  "135": {
    id: "LC #135", title: "Candy", difficulty: "Hard", topic: "Greedy · Two Passes",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Two-pass greedy</span>
        <span class="ans-chip">Local constraints</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Each child has a rating; every child gets ≥1 candy, and a child with a higher rating than a neighbor must get more candy. Minimize total candy. A <strong>two-pass</strong> greedy satisfies the left and right constraints independently.</p>

      <h3>How It Works</h3>
      <ul>
        <li><strong>Left-to-right:</strong> if <code>rating[i] &gt; rating[i-1]</code>, give <code>candy[i] = candy[i-1] + 1</code>.</li>
        <li><strong>Right-to-left:</strong> if <code>rating[i] &gt; rating[i+1]</code>, ensure <code>candy[i] = max(candy[i], candy[i+1] + 1)</code>.</li>
      </ul>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int candy(int[] ratings) {
    int n = ratings.length;
    int[] candy = new int[n];
    Arrays.fill(candy, 1);                       <span class="cc">// everyone gets 1</span>
    for (int i = 1; i &lt; n; i++)
        if (ratings[i] &gt; ratings[i - 1]) candy[i] = candy[i - 1] + 1;
    for (int i = n - 2; i &gt;= 0; i--)
        if (ratings[i] &gt; ratings[i + 1]) candy[i] = Math.max(candy[i], candy[i + 1] + 1);
    int total = 0;
    for (int c : candy) total += c;
    return total;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span> (O(1) possible with slope counting)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,0,2]</code>: L→R [1,1,2]; R→L child0 rating1&gt;0 → max(1,2)=2 → [2,1,2] → total <strong>5</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Doing only one pass — it satisfies one direction but violates the other. The <code>max</code> in the second pass preserves the first pass's guarantee.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Decompose two-sided constraints into two one-directional passes.</li><li>Combine with <code>max</code> so neither constraint is broken.</li></ul>`
  },

  "134": {
    id: "LC #134", title: "Gas Station", difficulty: "Medium", topic: "Greedy · Circular",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Greedy</span>
        <span class="ans-chip">Running tank</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>On a circular route, <code>gas[i]</code> is fuel available and <code>cost[i]</code> is fuel to reach the next station. Find the starting index to complete the loop, or −1. Greedy works in one pass.</p>

      <h3>Two Key Facts</h3>
      <ul>
        <li>If total gas &lt; total cost, the trip is impossible → −1.</li>
        <li>If the running tank goes negative at station <code>i</code>, no station in <code>[start..i]</code> can be the answer — restart from <code>i+1</code>.</li>
      </ul>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int canCompleteCircuit(int[] gas, int[] cost) {
    int total = 0, tank = 0, start = 0;
    for (int i = 0; i &lt; gas.length; i++) {
        int diff = gas[i] - cost[i];
        total += diff;
        tank += diff;
        if (tank &lt; 0) {        <span class="cc">// can't reach i+1 from current start</span>
            start = i + 1;     <span class="cc">// candidate restart</span>
            tank = 0;
        }
    }
    return total &lt; 0 ? -1 : start;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Try each start (brute)</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>Greedy one pass</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>gas=[1,2,3,4,5], cost=[3,4,5,1,2]</code>: tank dips negative through index 2, restart at 3; from 3 tank stays ≥0; total ≥0 → start <strong>3</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Why the restart is safe</span>If you couldn't reach <code>i+1</code> from <code>start</code>, you couldn't from any station between either (they'd have even less surplus). So skip them all.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Total surplus ≥ 0 ⇒ a solution exists and is unique.</li><li>Reset the start whenever the running tank goes negative.</li></ul>`
  },

  "gfg-min-platforms": {
    id: "GFG", title: "Minimum Platforms", difficulty: "Medium", topic: "Greedy · Sort + Sweep",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Sort arrivals/departures</span>
        <span class="ans-chip">Sweep line</span>
        <span class="ans-chip">Time O(n log n)</span>
      </div>

      <h3>Overview</h3>
      <p>Given train arrival and departure times, find the minimum number of platforms so no train waits. Sort both arrays and sweep with two pointers, tracking concurrent trains (the maximum overlap = platforms needed).</p>

      <h3>How It Works</h3>
      <p>Merge-sweep the sorted arrivals and departures: each arrival needs a platform (count++); each departure frees one (count−−). The peak count during the sweep is the answer.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int findPlatform(int[] arr, int[] dep) {
    Arrays.sort(arr);
    Arrays.sort(dep);
    int i = 0, j = 0, platforms = 0, maxPlat = 0;
    while (i &lt; arr.length) {
        if (arr[i] &lt;= dep[j]) {     <span class="cc">// a train arrives before/when one leaves</span>
            platforms++; i++;
            maxPlat = Math.max(maxPlat, platforms);
        } else {                    <span class="cc">// a train departs first</span>
            platforms--; j++;
        }
    }
    return maxPlat;
}</pre>
      <p>Use <code>&lt;=</code> for arrival vs departure if a train arriving exactly when another leaves still needs its own platform (common GFG convention).</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n log n)</span> (sorting)</td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>arr=[900,940,950,1100,1500,1800], dep=[910,1200,1120,1130,1900,2000]: peak concurrency = <strong>3</strong> platforms ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Same as Meeting Rooms II</span>This is LC 253 in disguise — minimum platforms = maximum overlapping intervals. A min-heap of departure times also solves it.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Sort arrivals and departures separately; sweep counting overlaps.</li><li>Maximum concurrency = platforms required.</li></ul>`
  }

});

/* ════════════════════════ INTERVALS ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "56": {
    id: "LC #56", title: "Merge Intervals", difficulty: "Medium", topic: "Intervals · Sort + Merge",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Sort by start</span>
        <span class="ans-chip">Merge overlaps</span>
        <span class="ans-chip">Time O(n log n)</span>
      </div>

      <h3>Overview</h3>
      <p>Merge all overlapping intervals. The standard recipe: <strong>sort by start</strong>, then sweep — if the current interval overlaps the last merged one, extend it; otherwise start a new merged interval.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -&gt; a[0] - b[0]);   <span class="cc">// by start</span>
    List&lt;int[]&gt; res = new ArrayList&lt;&gt;();
    int[] cur = intervals[0];
    for (int i = 1; i &lt; intervals.length; i++) {
        if (intervals[i][0] &lt;= cur[1]) {              <span class="cc">// overlap</span>
            cur[1] = Math.max(cur[1], intervals[i][1]); <span class="cc">// extend end</span>
        } else {
            res.add(cur);                            <span class="cc">// no overlap -&gt; commit</span>
            cur = intervals[i];
        }
    }
    res.add(cur);
    return res.toArray(new int[res.size()][]);
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n log n)</span> (sort dominates)</td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span> output</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[1,3],[2,6],[8,10],[15,18]]</code> → [1,3] & [2,6] overlap → [1,6]; [8,10] separate; [15,18] separate → <code>[[1,6],[8,10],[15,18]]</code> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Using <code>&lt;</code> instead of <code>&lt;=</code> when intervals touch (e.g. [1,4],[4,5]) — usually they should merge. Confirm the touching convention.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Foundation</span>"Sort by start, sweep" is the base pattern for nearly all interval problems (insert, overlap removal, etc.).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Sort by start; extend the end on overlap, else commit.</li><li>O(n log n) dominated by the sort.</li></ul>`
  },

  "57": {
    id: "LC #57", title: "Insert Interval", difficulty: "Medium", topic: "Intervals · Merge Insert",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Three phases</span>
        <span class="ans-chip">Already sorted</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Insert a new interval into an already-sorted, non-overlapping list and merge as needed. Since the list is sorted, a single O(n) pass in three phases suffices — no re-sorting.</p>

      <h3>Three Phases</h3>
      <ol>
        <li>Add all intervals ending <strong>before</strong> the new one starts (no overlap).</li>
        <li>Merge all intervals overlapping the new one into it.</li>
        <li>Add all intervals starting <strong>after</strong> the merged interval ends.</li>
      </ol>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int[][] insert(int[][] intervals, int[] newInterval) {
    List&lt;int[]&gt; res = new ArrayList&lt;&gt;();
    int i = 0, n = intervals.length;
    while (i &lt; n &amp;&amp; intervals[i][1] &lt; newInterval[0]) res.add(intervals[i++]); <span class="cc">// phase 1</span>
    while (i &lt; n &amp;&amp; intervals[i][0] &lt;= newInterval[1]) {                       <span class="cc">// phase 2</span>
        newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
        newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
        i++;
    }
    res.add(newInterval);
    while (i &lt; n) res.add(intervals[i++]);                                    <span class="cc">// phase 3</span>
    return res.toArray(new int[res.size()][]);
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span> (input already sorted)</td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span> output</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[1,3],[6,9]], new=[2,5]</code>: phase1 none ([1,3] overlaps); phase2 merges [1,3] then stops at [6,9] → new=[1,5]; phase3 adds [6,9] → <code>[[1,5],[6,9]]</code> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>The O(n) three-phase scan beats "append + re-run Merge Intervals" (O(n log n)) by exploiting the pre-sorted input.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Before / overlap / after — three linear phases.</li><li>Overlap test: <code>start ≤ newEnd</code> and <code>end ≥ newStart</code>.</li></ul>`
  },

  "253": {
    id: "LC #253", title: "Meeting Rooms II", difficulty: "Medium", topic: "Intervals · Min-Heap / Sweep",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Min-heap of end times</span>
        <span class="ans-chip">Max overlap</span>
        <span class="ans-chip">Time O(n log n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the minimum number of meeting rooms needed = the maximum number of meetings overlapping at any time. Two clean solutions: a min-heap of end times, or a sweep-line over sorted start/end events.</p>

      <h3>Java Code (Optimal — min-heap)</h3>
      <pre class="code-block">public int minMeetingRooms(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -&gt; a[0] - b[0]);   <span class="cc">// by start</span>
    PriorityQueue&lt;Integer&gt; heap = new PriorityQueue&lt;&gt;(); <span class="cc">// earliest end on top</span>
    for (int[] it : intervals) {
        if (!heap.isEmpty() &amp;&amp; heap.peek() &lt;= it[0]) {
            heap.poll();              <span class="cc">// a room freed up -&gt; reuse</span>
        }
        heap.offer(it[1]);            <span class="cc">// occupy a room until this end</span>
    }
    return heap.size();               <span class="cc">// rooms in use at peak</span>
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Min-heap</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td>Sweep (sorted starts/ends)</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[0,30],[5,10],[15,20]]</code>: heap gets 30; 5&lt;30 so add 10 (size2); 15≥10 poll, add 20 (size2) → <strong>2</strong> rooms ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Equivalent problems</span>Minimum Platforms (GFG), Car Pooling, Maximum CPU load — all "max overlapping intervals."</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Using <code>&lt;</code> vs <code>&lt;=</code> for the end-vs-start comparison: a meeting ending exactly when another starts can reuse the room (use <code>&lt;=</code>).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Rooms needed = peak concurrent meetings.</li><li>Min-heap of end times reuses freed rooms greedily.</li></ul>`
  },

  "435": {
    id: "LC #435", title: "Non-Overlapping Intervals", difficulty: "Medium", topic: "Intervals · Greedy by End",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Greedy</span>
        <span class="ans-chip">Sort by end</span>
        <span class="ans-chip">Activity selection</span>
      </div>

      <h3>Overview</h3>
      <p>Find the minimum number of intervals to remove so the rest don't overlap. This is the <strong>activity selection</strong> problem: sort by <strong>end time</strong> and greedily keep intervals that don't overlap the last kept one; everything else is removed.</p>

      <h3>Why Sort by End</h3>
      <p>Keeping the interval that ends earliest leaves the most room for future intervals — the classic greedy exchange argument.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int eraseOverlapIntervals(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -&gt; a[1] - b[1]);   <span class="cc">// by end time</span>
    int kept = 0, end = Integer.MIN_VALUE;
    for (int[] it : intervals) {
        if (it[0] &gt;= end) {        <span class="cc">// no overlap -&gt; keep</span>
            kept++;
            end = it[1];
        }
    }
    return intervals.length - kept; <span class="cc">// the rest must be removed</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n log n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[1,2],[2,3],[3,4],[1,3]]</code> sorted by end → keep [1,2],[2,3],[3,4]; [1,3] overlaps → remove 1 → answer <strong>1</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Sorting by start. It can fail — a long early interval blocks several short ones. Sort by <em>end</em> for the optimal greedy.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Sort by end, greedily keep non-overlapping → remove the rest.</li><li>Removals = total − maximum non-overlapping set.</li></ul>`
  },

  "452": {
    id: "LC #452", title: "Minimum Number of Arrows to Burst Balloons", difficulty: "Medium", topic: "Intervals · Greedy by End",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Greedy</span>
        <span class="ans-chip">Sort by end</span>
        <span class="ans-chip">Time O(n log n)</span>
      </div>

      <h3>Overview</h3>
      <p>Balloons are intervals on the x-axis; an arrow at <code>x</code> bursts every balloon spanning <code>x</code>. Find the minimum arrows. Greedy: sort by end, shoot at each group's earliest end, covering as many overlapping balloons as possible.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int findMinArrowShots(int[][] points) {
    if (points.length == 0) return 0;
    Arrays.sort(points, (a, b) -&gt; Integer.compare(a[1], b[1])); <span class="cc">// by end (overflow-safe)</span>
    int arrows = 1, end = points[0][1];
    for (int i = 1; i &lt; points.length; i++) {
        if (points[i][0] &gt; end) {   <span class="cc">// balloon starts after last arrow</span>
            arrows++;
            end = points[i][1];     <span class="cc">// new arrow at this balloon's end</span>
        }
    }
    return arrows;
}</pre>
      <p>Use <code>Integer.compare</code> (not <code>a[1] - b[1]</code>) — coordinates can be near <code>Integer.MIN/MAX</code> and subtraction overflows.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n log n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[10,16],[2,8],[1,6],[7,12]]</code> sorted by end → arrow at 6 bursts [1,6],[2,8]; next [7,12] starts &gt;6 → arrow at 12 bursts [7,12],[10,16] → <strong>2</strong> arrows ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Cousin of LC 435</span>Same "sort by end" greedy. Here you count groups (arrows); there you count removals. Note the strict <code>&gt;</code> (touching balloons share an arrow).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Sort by end; one arrow per group of overlapping balloons.</li><li>Use overflow-safe comparison for extreme coordinates.</li></ul>`
  }

});

/* ════════════════════════ BACKTRACKING ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "78": {
    id: "LC #78", title: "Subsets", difficulty: "Medium", topic: "Backtracking · Power Set",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Backtracking</span>
        <span class="ans-chip">Include / exclude</span>
        <span class="ans-chip">Time O(n·2ⁿ)</span>
      </div>

      <h3>Overview</h3>
      <p>Generate all <code>2ⁿ</code> subsets (the power set) of distinct integers. The backtracking template explores a decision tree where each element is either included or excluded.</p>

      <h3>Java Code (Optimal — backtracking)</h3>
      <pre class="code-block">public List&lt;List&lt;Integer&gt;&gt; subsets(int[] nums) {
    List&lt;List&lt;Integer&gt;&gt; res = new ArrayList&lt;&gt;();
    backtrack(nums, 0, new ArrayList&lt;&gt;(), res);
    return res;
}
private void backtrack(int[] nums, int start, List&lt;Integer&gt; path, List&lt;List&lt;Integer&gt;&gt; res) {
    res.add(new ArrayList&lt;&gt;(path));        <span class="cc">// every node is a valid subset</span>
    for (int i = start; i &lt; nums.length; i++) {
        path.add(nums[i]);                 <span class="cc">// choose</span>
        backtrack(nums, i + 1, path, res); <span class="cc">// explore</span>
        path.remove(path.size() - 1);      <span class="cc">// un-choose (backtrack)</span>
    }
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n · 2ⁿ)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span> recursion (+ output)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,3]</code> → [], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3] (8 subsets) ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Template</span>This choose/explore/un-choose skeleton underlies almost every backtracking problem. The <code>start</code> index prevents reusing earlier elements (avoids permutations of the same subset).</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Adding <code>path</code> directly instead of a copy — all results would reference the same mutating list.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Record every node; recurse with <code>i+1</code> to keep subsets ordered.</li><li>Always store a copy of the path.</li></ul>`
  },

  "90": {
    id: "LC #90", title: "Subsets II", difficulty: "Medium", topic: "Backtracking · Dedup",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Backtracking</span>
        <span class="ans-chip">Skip duplicates</span>
        <span class="ans-chip">Sorted input</span>
      </div>

      <h3>Overview</h3>
      <p>Generate all unique subsets when the input <strong>contains duplicates</strong>. Sort first, then at each recursion level skip duplicate choices to avoid generating the same subset twice.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;List&lt;Integer&gt;&gt; subsetsWithDup(int[] nums) {
    Arrays.sort(nums);                     <span class="cc">// duplicates become adjacent</span>
    List&lt;List&lt;Integer&gt;&gt; res = new ArrayList&lt;&gt;();
    backtrack(nums, 0, new ArrayList&lt;&gt;(), res);
    return res;
}
private void backtrack(int[] nums, int start, List&lt;Integer&gt; path, List&lt;List&lt;Integer&gt;&gt; res) {
    res.add(new ArrayList&lt;&gt;(path));
    for (int i = start; i &lt; nums.length; i++) {
        if (i &gt; start &amp;&amp; nums[i] == nums[i - 1]) continue; <span class="cc">// skip dup at this level</span>
        path.add(nums[i]);
        backtrack(nums, i + 1, path, res);
        path.remove(path.size() - 1);
    }
}</pre>
      <p>The key is <code>i &gt; start</code>: we skip a duplicate only when it's a sibling at the same tree level, not when it's the first pick of this branch.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n · 2ⁿ)</span> worst case</td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span> recursion</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,2]</code> → [], [1], [1,2], [1,2,2], [2], [2,2]. The second 2 at the top level is skipped, preventing a duplicate [2] / [2,2].</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Using <code>i &gt; 0</code> instead of <code>i &gt; start</code> — that wrongly skips valid picks deeper in a branch.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Sort, then skip same-level duplicates with <code>i &gt; start</code>.</li><li>Same template as Subsets, plus a dedup guard.</li></ul>`
  },

  "46": {
    id: "LC #46", title: "Permutations", difficulty: "Medium", topic: "Backtracking · Arrangements",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Backtracking</span>
        <span class="ans-chip">Used marker</span>
        <span class="ans-chip">Time O(n·n!)</span>
      </div>

      <h3>Overview</h3>
      <p>Generate all <code>n!</code> permutations of distinct integers. Unlike subsets, order matters and every element is used once per permutation — track which elements are already in the current path.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;List&lt;Integer&gt;&gt; permute(int[] nums) {
    List&lt;List&lt;Integer&gt;&gt; res = new ArrayList&lt;&gt;();
    backtrack(nums, new boolean[nums.length], new ArrayList&lt;&gt;(), res);
    return res;
}
private void backtrack(int[] nums, boolean[] used, List&lt;Integer&gt; path, List&lt;List&lt;Integer&gt;&gt; res) {
    if (path.size() == nums.length) {       <span class="cc">// full permutation</span>
        res.add(new ArrayList&lt;&gt;(path));
        return;
    }
    for (int i = 0; i &lt; nums.length; i++) {
        if (used[i]) continue;              <span class="cc">// element already placed</span>
        used[i] = true; path.add(nums[i]);
        backtrack(nums, used, path, res);
        used[i] = false; path.remove(path.size() - 1); <span class="cc">// backtrack</span>
    }
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n · n!)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span> recursion</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,3]</code> → 6 permutations: [1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1] ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Variant (LC 47)</span>With duplicates: sort and add <code>if (i &gt; 0 &amp;&amp; nums[i]==nums[i-1] &amp;&amp; !used[i-1]) continue;</code> to skip duplicate branches.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Difference from subsets</span>Permutations scan from <code>0</code> every time (with a <code>used</code> marker), not from <code>start</code> — order matters here.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Use a <code>used[]</code> marker; record when the path is full.</li><li>No <code>start</code> index — every unused element is a candidate at each step.</li></ul>`
  },

  "77": {
    id: "LC #77", title: "Combinations", difficulty: "Medium", topic: "Backtracking · Choose k",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Backtracking</span>
        <span class="ans-chip">Pruning</span>
        <span class="ans-chip">Choose k of n</span>
      </div>

      <h3>Overview</h3>
      <p>Generate all combinations of <code>k</code> numbers from <code>1..n</code>. Same subset template but stop when the path reaches size <code>k</code>; prune branches that can't possibly complete.</p>

      <h3>Java Code (Optimal — with pruning)</h3>
      <pre class="code-block">public List&lt;List&lt;Integer&gt;&gt; combine(int n, int k) {
    List&lt;List&lt;Integer&gt;&gt; res = new ArrayList&lt;&gt;();
    backtrack(1, n, k, new ArrayList&lt;&gt;(), res);
    return res;
}
private void backtrack(int start, int n, int k, List&lt;Integer&gt; path, List&lt;List&lt;Integer&gt;&gt; res) {
    if (path.size() == k) { res.add(new ArrayList&lt;&gt;(path)); return; }
    <span class="cc">// prune: need (k - path.size()) more; stop if not enough numbers remain</span>
    int need = k - path.size();
    for (int i = start; i &lt;= n - need + 1; i++) {
        path.add(i);
        backtrack(i + 1, n, k, path, res);
        path.remove(path.size() - 1);
    }
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(k · C(n,k))</span></td><td></td></tr><tr><td>Space</td><td><span class="ans-cx">O(k)</span> recursion</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>n=4, k=2</code> → [1,2],[1,3],[1,4],[2,3],[2,4],[3,4] (C(4,2)=6) ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Pruning matters</span>The bound <code>i &lt;= n - need + 1</code> skips starts that can't yield k elements — a big speedup for large n,k.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Subset template with a size-k base case.</li><li>Prune branches lacking enough remaining numbers.</li></ul>`
  },

  "39": {
    id: "LC #39", title: "Combination Sum", difficulty: "Medium", topic: "Backtracking · Reuse",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Backtracking</span>
        <span class="ans-chip">Unlimited reuse</span>
        <span class="ans-chip">Target sum</span>
      </div>

      <h3>Overview</h3>
      <p>Find all unique combinations of candidates (distinct) summing to <code>target</code>; each candidate may be used <strong>unlimited</strong> times. The reuse is expressed by recursing with the <em>same</em> index <code>i</code> rather than <code>i+1</code>.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;List&lt;Integer&gt;&gt; combinationSum(int[] candidates, int target) {
    List&lt;List&lt;Integer&gt;&gt; res = new ArrayList&lt;&gt;();
    Arrays.sort(candidates);               <span class="cc">// enables early break</span>
    backtrack(candidates, target, 0, new ArrayList&lt;&gt;(), res);
    return res;
}
private void backtrack(int[] c, int remain, int start, List&lt;Integer&gt; path, List&lt;List&lt;Integer&gt;&gt; res) {
    if (remain == 0) { res.add(new ArrayList&lt;&gt;(path)); return; }
    for (int i = start; i &lt; c.length; i++) {
        if (c[i] &gt; remain) break;          <span class="cc">// sorted -&gt; no further candidate fits</span>
        path.add(c[i]);
        backtrack(c, remain - c[i], i, path, res); <span class="cc">// i (not i+1) -&gt; reuse</span>
        path.remove(path.size() - 1);
    }
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n^(target/min))</span> (exponential)</td></tr><tr><td>Space</td><td><span class="ans-cx">O(target/min)</span> depth</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>candidates=[2,3,6,7], target=7</code> → [2,2,3] and [7] ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Reuse vs no-reuse</span>Recurse with <code>i</code> to allow reuse (this problem). For Combination Sum II (LC 40, each used once + duplicates), recurse with <code>i+1</code> and add the same-level dedup skip.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Recurse with the same index to allow unlimited reuse.</li><li>Sort + early break prunes impossible branches.</li></ul>`
  },

  "17": {
    id: "LC #17", title: "Letter Combinations of a Phone Number", difficulty: "Medium", topic: "Backtracking · Mapping",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Backtracking</span>
        <span class="ans-chip">Digit→letters map</span>
        <span class="ans-chip">Time O(4ⁿ·n)</span>
      </div>

      <h3>Overview</h3>
      <p>Given digits 2–9, return all letter combinations (phone keypad mapping). Backtrack across digit positions, trying each letter the digit maps to.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">private static final String[] MAP = {
    "", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"
};
public List&lt;String&gt; letterCombinations(String digits) {
    List&lt;String&gt; res = new ArrayList&lt;&gt;();
    if (digits.isEmpty()) return res;
    backtrack(digits, 0, new StringBuilder(), res);
    return res;
}
private void backtrack(String digits, int idx, StringBuilder sb, List&lt;String&gt; res) {
    if (idx == digits.length()) { res.add(sb.toString()); return; }
    String letters = MAP[digits.charAt(idx) - '0'];
    for (char c : letters.toCharArray()) {
        sb.append(c);
        backtrack(digits, idx + 1, sb, res);
        sb.deleteCharAt(sb.length() - 1);   <span class="cc">// backtrack</span>
    }
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(4ⁿ · n)</span> (n digits, up to 4 letters each)</td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span> recursion</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>"23"</code> → a/b/c × d/e/f → ad,ae,af,bd,be,bf,cd,ce,cf (9) ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Edge case</span>Empty input returns an empty list (not a list with one empty string).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Backtrack one digit position at a time over its mapped letters.</li><li>Use a StringBuilder with append/delete for efficient path building.</li></ul>`
  },

  "22": {
    id: "LC #22", title: "Generate Parentheses", difficulty: "Medium", topic: "Backtracking · Validity Pruning",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Backtracking</span>
        <span class="ans-chip">Open/close counts</span>
        <span class="ans-chip">Catalan number</span>
      </div>

      <h3>Overview</h3>
      <p>Generate all valid combinations of <code>n</code> pairs of parentheses. Backtrack while maintaining validity: you can add <code>(</code> if opens &lt; n, and <code>)</code> only if closes &lt; opens.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;String&gt; generateParenthesis(int n) {
    List&lt;String&gt; res = new ArrayList&lt;&gt;();
    backtrack(n, 0, 0, new StringBuilder(), res);
    return res;
}
private void backtrack(int n, int open, int close, StringBuilder sb, List&lt;String&gt; res) {
    if (sb.length() == 2 * n) { res.add(sb.toString()); return; }
    if (open &lt; n) {                       <span class="cc">// can open another</span>
        sb.append('(');
        backtrack(n, open + 1, close, sb, res);
        sb.deleteCharAt(sb.length() - 1);
    }
    if (close &lt; open) {                   <span class="cc">// can close only if unmatched opens</span>
        sb.append(')');
        backtrack(n, open, close + 1, sb, res);
        sb.deleteCharAt(sb.length() - 1);
    }
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(4ⁿ / √n)</span> (Catalan number)</td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span> recursion</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>n=2</code> → "(())", "()()" ✓ (Catalan C₂ = 2).</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Why pruning beats generate-and-filter</span>The validity constraints (<code>open &lt; n</code>, <code>close &lt; open</code>) only ever build valid strings — no wasted invalid candidates.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Add <code>(</code> while opens &lt; n; add <code>)</code> while closes &lt; opens.</li><li>Validity-preserving pruning avoids generating bad strings.</li></ul>`
  },

  "51": {
    id: "LC #51", title: "N-Queens", difficulty: "Hard", topic: "Backtracking · Constraints",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Backtracking</span>
        <span class="ans-chip">Diagonal sets</span>
        <span class="ans-chip">Row-by-row</span>
      </div>

      <h3>Overview</h3>
      <p>Place <code>n</code> queens on an <code>n×n</code> board so none attack each other. Backtrack row by row; for each row try every column that isn't attacked, using sets to track threatened columns and diagonals in O(1).</p>

      <h3>Key Insight — diagonal identifiers</h3>
      <ul>
        <li>Cells on the same <strong>↘ diagonal</strong> share <code>row − col</code>.</li>
        <li>Cells on the same <strong>↙ anti-diagonal</strong> share <code>row + col</code>.</li>
      </ul>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;List&lt;String&gt;&gt; solveNQueens(int n) {
    List&lt;List&lt;String&gt;&gt; res = new ArrayList&lt;&gt;();
    int[] queens = new int[n];                 <span class="cc">// queens[r] = column</span>
    Set&lt;Integer&gt; cols = new HashSet&lt;&gt;(), diag = new HashSet&lt;&gt;(), anti = new HashSet&lt;&gt;();
    backtrack(0, n, queens, cols, diag, anti, res);
    return res;
}
private void backtrack(int r, int n, int[] q, Set&lt;Integer&gt; cols,
                       Set&lt;Integer&gt; diag, Set&lt;Integer&gt; anti, List&lt;List&lt;String&gt;&gt; res) {
    if (r == n) { res.add(build(q, n)); return; }
    for (int c = 0; c &lt; n; c++) {
        if (cols.contains(c) || diag.contains(r - c) || anti.contains(r + c)) continue;
        q[r] = c; cols.add(c); diag.add(r - c); anti.add(r + c);
        backtrack(r + 1, n, q, cols, diag, anti, res);
        cols.remove(c); diag.remove(r - c); anti.remove(r + c); <span class="cc">// backtrack</span>
    }
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n!)</span> (heavily pruned)</td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>n=4</code> → 2 distinct solutions. The diagonal sets reject conflicting columns instantly, pruning most of the tree.</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>The <code>row±col</code> diagonal trick is the crux — it turns attack checks into O(1) set lookups. LC 52 just counts solutions (drop the board building).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Place one queen per row; track columns and both diagonals in sets.</li><li>Diagonals: <code>row−col</code> (main), <code>row+col</code> (anti).</li></ul>`
  },

  "37": {
    id: "LC #37", title: "Sudoku Solver", difficulty: "Hard", topic: "Backtracking · Constraint Search",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Backtracking</span>
        <span class="ans-chip">Try 1–9</span>
        <span class="ans-chip">Validity check</span>
      </div>

      <h3>Overview</h3>
      <p>Fill a 9×9 Sudoku. Backtrack over empty cells: try digits 1–9, keep ones that don't violate row/column/box constraints, recurse, and undo on failure.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public void solveSudoku(char[][] board) {
    solve(board);
}
private boolean solve(char[][] b) {
    for (int r = 0; r &lt; 9; r++) {
        for (int c = 0; c &lt; 9; c++) {
            if (b[r][c] == '.') {
                for (char d = '1'; d &lt;= '9'; d++) {
                    if (isValid(b, r, c, d)) {
                        b[r][c] = d;                  <span class="cc">// place</span>
                        if (solve(b)) return true;    <span class="cc">// recurse</span>
                        b[r][c] = '.';                <span class="cc">// undo</span>
                    }
                }
                return false;                          <span class="cc">// no digit fits -&gt; backtrack</span>
            }
        }
    }
    return true;                                       <span class="cc">// no empty cell left</span>
}
private boolean isValid(char[][] b, int r, int c, char d) {
    for (int i = 0; i &lt; 9; i++) {
        if (b[r][i] == d || b[i][c] == d) return false;
        if (b[3*(r/3) + i/3][3*(c/3) + i%3] == d) return false; <span class="cc">// box</span>
    }
    return true;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(9^(empty cells))</span> worst case</td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> board + recursion</td></tr></tbody></table>

      <div class="ans-callout tip"><span class="ans-callout-label">Optimizations</span>Track row/col/box availability with bitmasks for O(1) validity, and fill the most-constrained cell first (MRV heuristic) to prune aggressively.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Forgetting to undo (<code>b[r][c]='.'</code>) on failure, or returning true before confirming the full board is filled.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Try 1–9 per empty cell; recurse; undo on dead ends.</li><li>Reuses the LC 36 validity check as the constraint test.</li></ul>`
  }

});

/* ════════════════════════ TREE ════════════════════════
 * All solutions assume:  class TreeNode { int val; TreeNode left, right; }
 * ====================================================== */
Object.assign(window.DSA_ANSWERS, {

  "102": {
    id: "LC #102", title: "Binary Tree Level Order Traversal", difficulty: "Medium", topic: "Tree · BFS",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">BFS</span>
        <span class="ans-chip">Queue by level</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return node values level by level (top to bottom, left to right). The textbook <strong>BFS</strong>: process the queue one level at a time by snapshotting its size before each level.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;List&lt;Integer&gt;&gt; levelOrder(TreeNode root) {
    List&lt;List&lt;Integer&gt;&gt; res = new ArrayList&lt;&gt;();
    if (root == null) return res;
    Queue&lt;TreeNode&gt; q = new LinkedList&lt;&gt;();
    q.offer(root);
    while (!q.isEmpty()) {
        int size = q.size();              <span class="cc">// nodes in THIS level</span>
        List&lt;Integer&gt; level = new ArrayList&lt;&gt;();
        for (int i = 0; i &lt; size; i++) {
            TreeNode node = q.poll();
            level.add(node.val);
            if (node.left != null)  q.offer(node.left);
            if (node.right != null) q.offer(node.right);
        }
        res.add(level);
    }
    return res;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span> (queue width)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[3,9,20,null,null,15,7]</code> → [[3],[9,20],[15,7]] ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Foundation</span>Snapshotting <code>q.size()</code> per level is the trick behind Right Side View, Zigzag, Average of Levels, etc.</div>

      <h3>Key Takeaways</h3>
      <ul><li>BFS with a per-level size snapshot groups nodes by depth.</li><li>O(n) time and space.</li></ul>`
  },

  "637": {
    id: "LC #637", title: "Average of Levels in Binary Tree", difficulty: "Easy", topic: "Tree · BFS",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">BFS</span>
        <span class="ans-chip">Per-level sum</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return the average value of nodes on each level. Same level-order BFS as LC 102, but accumulate a sum per level and divide by the count.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;Double&gt; averageOfLevels(TreeNode root) {
    List&lt;Double&gt; res = new ArrayList&lt;&gt;();
    Queue&lt;TreeNode&gt; q = new LinkedList&lt;&gt;();
    q.offer(root);
    while (!q.isEmpty()) {
        int size = q.size();
        double sum = 0;
        for (int i = 0; i &lt; size; i++) {
            TreeNode node = q.poll();
            sum += node.val;                 <span class="cc">// use double to avoid overflow</span>
            if (node.left != null)  q.offer(node.left);
            if (node.right != null) q.offer(node.right);
        }
        res.add(sum / size);
    }
    return res;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[3,9,20,null,null,15,7]</code> → [3.0, 14.5, 11.0] ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Overflow</span>Use a <code>double</code> (or <code>long</code>) accumulator — a level of large ints can overflow <code>int</code>.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Level-order BFS + per-level average.</li><li>Guard against integer overflow in the sum.</li></ul>`
  },

  "103": {
    id: "LC #103", title: "Binary Tree Zigzag Level Order Traversal", difficulty: "Medium", topic: "Tree · BFS",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">BFS</span>
        <span class="ans-chip">Alternate direction</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Level order, but alternate left→right and right→left per level. Run normal BFS and reverse every other level (or insert at the front using a deque).</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;List&lt;Integer&gt;&gt; zigzagLevelOrder(TreeNode root) {
    List&lt;List&lt;Integer&gt;&gt; res = new ArrayList&lt;&gt;();
    if (root == null) return res;
    Queue&lt;TreeNode&gt; q = new LinkedList&lt;&gt;();
    q.offer(root);
    boolean leftToRight = true;
    while (!q.isEmpty()) {
        int size = q.size();
        LinkedList&lt;Integer&gt; level = new LinkedList&lt;&gt;();
        for (int i = 0; i &lt; size; i++) {
            TreeNode node = q.poll();
            if (leftToRight) level.addLast(node.val);
            else             level.addFirst(node.val); <span class="cc">// reverse via deque</span>
            if (node.left != null)  q.offer(node.left);
            if (node.right != null) q.offer(node.right);
        }
        res.add(level);
        leftToRight = !leftToRight;
    }
    return res;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[3,9,20,null,null,15,7]</code> → [[3],[20,9],[15,7]] ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Tip</span>Using <code>addFirst</code> on a deque avoids an explicit reverse, keeping it O(n).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Standard BFS + a direction flag.</li><li>Front-insertion (deque) flips a level cheaply.</li></ul>`
  },

  "199": {
    id: "LC #199", title: "Binary Tree Right Side View", difficulty: "Medium", topic: "Tree · BFS",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">BFS</span>
        <span class="ans-chip">Last node per level</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return the values visible from the right side — the last node of each level. Level-order BFS and take the final node processed at each level.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;Integer&gt; rightSideView(TreeNode root) {
    List&lt;Integer&gt; res = new ArrayList&lt;&gt;();
    if (root == null) return res;
    Queue&lt;TreeNode&gt; q = new LinkedList&lt;&gt;();
    q.offer(root);
    while (!q.isEmpty()) {
        int size = q.size();
        for (int i = 0; i &lt; size; i++) {
            TreeNode node = q.poll();
            if (i == size - 1) res.add(node.val); <span class="cc">// rightmost of level</span>
            if (node.left != null)  q.offer(node.left);
            if (node.right != null) q.offer(node.right);
        }
    }
    return res;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,3,null,5,null,4]</code> → [1,3,4] ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">DFS alternative</span>Preorder visiting right child first; record the first node seen at each new depth.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Rightmost node per level = right side view.</li><li>BFS (last in level) or right-first DFS (first per depth).</li></ul>`
  },

  "101": {
    id: "LC #101", title: "Symmetric Tree", difficulty: "Easy", topic: "Tree · Mirror Recursion",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Mirror check</span>
        <span class="ans-chip">Recursion</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Check if a tree is a mirror of itself. Recursively compare the left subtree against the right subtree as mirror images: outer pairs with outer, inner with inner.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public boolean isSymmetric(TreeNode root) {
    return root == null || isMirror(root.left, root.right);
}
private boolean isMirror(TreeNode a, TreeNode b) {
    if (a == null &amp;&amp; b == null) return true;
    if (a == null || b == null || a.val != b.val) return false;
    return isMirror(a.left, b.right)   <span class="cc">// outer pair</span>
        &amp;&amp; isMirror(a.right, b.left);   <span class="cc">// inner pair</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(h)</span> recursion</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,2,3,4,4,3]</code>: mirror(2,2)→ mirror(3,3) &amp; mirror(4,4) → true ✓. <code>[1,2,2,null,3,null,3]</code> → false.</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Comparing <code>a.left</code> with <code>b.left</code> — for mirror symmetry you must cross: <code>a.left</code> ↔ <code>b.right</code>.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Symmetry = left subtree mirrors right subtree.</li><li>Cross the recursion: outer↔outer, inner↔inner.</li></ul>`
  },

  "543": {
    id: "LC #543", title: "Diameter of Binary Tree", difficulty: "Easy", topic: "Tree · DFS Height",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DFS height</span>
        <span class="ans-chip">Global max</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>The diameter is the longest path (in edges) between any two nodes. At each node, the longest path passing through it = leftHeight + rightHeight. Compute heights via DFS while tracking the global maximum.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">private int diameter = 0;
public int diameterOfBinaryTree(TreeNode root) {
    height(root);
    return diameter;
}
private int height(TreeNode node) {
    if (node == null) return 0;
    int left = height(node.left);
    int right = height(node.right);
    diameter = Math.max(diameter, left + right); <span class="cc">// path through this node</span>
    return 1 + Math.max(left, right);            <span class="cc">// height to parent</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(h)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,3,4,5]</code>: at node 2, left=1(node4) right=1(node5) → diameter 2; path 4→2→5. Answer <strong>2</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Returning <code>left + right</code> as the height. Height returned to the parent is <code>1 + max(left,right)</code>; the sum is only for the diameter update.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Diameter at a node = left height + right height (edges).</li><li>One DFS computes heights and the global max together.</li></ul>`
  },

  "226": {
    id: "LC #226", title: "Invert Binary Tree", difficulty: "Easy", topic: "Tree · Recursion",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Recursion</span>
        <span class="ans-chip">Swap children</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Mirror a binary tree by swapping the left and right child of every node. A two-line recursion.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public TreeNode invertTree(TreeNode root) {
    if (root == null) return null;
    TreeNode left = invertTree(root.left);
    TreeNode right = invertTree(root.right);
    root.left = right;     <span class="cc">// swap</span>
    root.right = left;
    return root;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(h)</span> recursion (or O(n) BFS)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[4,2,7,1,3,6,9]</code> → <code>[4,7,2,9,6,3,1]</code> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Trivia</span>Famously the "invert a binary tree" interview question. An iterative BFS/DFS swapping children works equally well.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Swap children at every node, recursively.</li><li>Both recursive and iterative are O(n).</li></ul>`
  },

  "104": {
    id: "LC #104", title: "Maximum Depth of Binary Tree", difficulty: "Easy", topic: "Tree · DFS",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DFS recursion</span>
        <span class="ans-chip">Height</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return the number of nodes on the longest root-to-leaf path. The depth of a node is <code>1 + max(depth(left), depth(right))</code>.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int maxDepth(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(h)</span> (O(n) worst skewed)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[3,9,20,null,null,15,7]</code> → depth 3 ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Iterative</span>BFS counting levels gives the same answer and avoids recursion-stack overflow on degenerate (linked-list-like) trees.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Depth = 1 + max(child depths).</li><li>Base of countless tree DFS problems.</li></ul>`
  },

  "110": {
    id: "LC #110", title: "Balanced Binary Tree", difficulty: "Easy", topic: "Tree · DFS Height",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DFS height</span>
        <span class="ans-chip">Early exit (-1)</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>A tree is height-balanced if, for every node, the left and right subtree heights differ by ≤ 1. Compute heights bottom-up and short-circuit with a sentinel <code>-1</code> when imbalance is found — this gives O(n).</p>

      <h3>Java Code (Optimal — single pass)</h3>
      <pre class="code-block">public boolean isBalanced(TreeNode root) {
    return height(root) != -1;
}
private int height(TreeNode node) {
    if (node == null) return 0;
    int left = height(node.left);
    if (left == -1) return -1;                 <span class="cc">// left subtree unbalanced</span>
    int right = height(node.right);
    if (right == -1) return -1;
    if (Math.abs(left - right) &gt; 1) return -1; <span class="cc">// this node unbalanced</span>
    return 1 + Math.max(left, right);
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Naive (height per node)</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(h)</span></td></tr>
        <tr><td><strong>Bottom-up with −1</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(h)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,2,3,3,null,null,4,4]</code> → a subtree's children heights differ by 2 → returns −1 → <strong>false</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Recomputing height at every node (top-down) → O(n²). The −1 sentinel folds the balance check into one bottom-up pass.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Return −1 to propagate imbalance and short-circuit.</li><li>Single bottom-up pass → O(n).</li></ul>`
  },

  "108": {
    id: "LC #108", title: "Convert Sorted Array to BST", difficulty: "Easy", topic: "Tree · Divide & Conquer",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Divide & conquer</span>
        <span class="ans-chip">Pick middle</span>
        <span class="ans-chip">Height-balanced</span>
      </div>

      <h3>Overview</h3>
      <p>Build a height-balanced BST from a sorted array. Choosing the <strong>middle</strong> element as the root at each step keeps the two halves balanced; recurse on left and right subarrays.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public TreeNode sortedArrayToBST(int[] nums) {
    return build(nums, 0, nums.length - 1);
}
private TreeNode build(int[] nums, int lo, int hi) {
    if (lo &gt; hi) return null;
    int mid = lo + (hi - lo) / 2;          <span class="cc">// middle keeps balance</span>
    TreeNode root = new TreeNode(nums[mid]);
    root.left = build(nums, lo, mid - 1);
    root.right = build(nums, mid + 1, hi);
    return root;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(log n)</span> recursion</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[-10,-3,0,5,9]</code>: mid 0 root; left [-10,-3] → -3 root; right [5,9] → 9 root → balanced BST ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Why middle</span>The middle splits remaining elements evenly, guaranteeing height O(log n). Any consistent middle choice (left/right of two) is valid.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Middle element as root → balanced BST.</li><li>Recurse on the two halves.</li></ul>`
  }

});

/* ════════════════════════ TREE (cont.) ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "114": {
    id: "LC #114", title: "Flatten Binary Tree to Linked List", difficulty: "Medium", topic: "Tree · Morris-like",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Preorder flatten</span>
        <span class="ans-chip">O(1) space option</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Flatten the tree in place into a right-skewed "linked list" following preorder. The elegant O(1)-space method rewires each node's left subtree to its right, threading the original right subtree after it.</p>

      <h3>Java Code (Optimal — O(1) space)</h3>
      <pre class="code-block">public void flatten(TreeNode root) {
    TreeNode cur = root;
    while (cur != null) {
        if (cur.left != null) {
            TreeNode prev = cur.left;
            while (prev.right != null) prev = prev.right; <span class="cc">// rightmost of left subtree</span>
            prev.right = cur.right;     <span class="cc">// thread original right after it</span>
            cur.right = cur.left;       <span class="cc">// move left subtree to right</span>
            cur.left = null;
        }
        cur = cur.right;                <span class="cc">// advance down the new spine</span>
    }
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Preorder to list, relink</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td><strong>Morris-like rewire</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,5,3,4,null,6]</code> → <code>1→2→3→4→5→6</code> (all on right pointers) ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>If O(1) feels risky, do a reverse-preorder recursion (right, left, root) keeping a <code>prev</code> pointer — simpler to write, O(h) stack.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Splice each left subtree onto the right spine.</li><li>Morris-style rewiring achieves O(1) space.</li></ul>`
  },

  "98": {
    id: "LC #98", title: "Validate Binary Search Tree", difficulty: "Medium", topic: "BST · Range / Inorder",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Min/max bounds</span>
        <span class="ans-chip">Inorder alternative</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Verify a tree is a valid BST: every node's value must lie strictly within an allowed <code>(min, max)</code> range that tightens as you descend. A common bug is comparing only against direct children — you must enforce ancestor bounds.</p>

      <h3>Java Code (Optimal — range check)</h3>
      <pre class="code-block">public boolean isValidBST(TreeNode root) {
    return valid(root, Long.MIN_VALUE, Long.MAX_VALUE);
}
private boolean valid(TreeNode node, long min, long max) {
    if (node == null) return true;
    if (node.val &lt;= min || node.val &gt;= max) return false; <span class="cc">// out of range</span>
    return valid(node.left, min, node.val)    <span class="cc">// right bound tightens</span>
        &amp;&amp; valid(node.right, node.val, max);   <span class="cc">// left bound tightens</span>
}</pre>
      <p>Using <code>long</code> bounds avoids edge cases where a node equals <code>Integer.MIN/MAX_VALUE</code>.</p>

      <h4>Inorder alternative</h4>
      <pre class="code-block"><span class="cc">// A valid BST yields a strictly increasing inorder traversal.</span>
      <span class="cc">// Track the previous value; if cur &lt;= prev, return false.</span></pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(h)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[5,1,4,null,null,3,6]</code>: node 3 is in the right subtree of 5 but 3 &lt; 5 → fails the <code>min=5</code> bound → <strong>false</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Only checking <code>left &lt; node &lt; right</code> for immediate children. A deep node can satisfy its parent yet violate a grandparent — propagate bounds.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Each node must respect inherited (min,max) bounds.</li><li>Inorder traversal must be strictly increasing.</li></ul>`
  },

  "236": {
    id: "LC #236", title: "Lowest Common Ancestor of a Binary Tree", difficulty: "Medium", topic: "Tree · Recursion",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Post-order recursion</span>
        <span class="ans-chip">Split point</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the lowest node that is an ancestor of both <code>p</code> and <code>q</code> in a general binary tree (not a BST). Recurse: if <code>p</code> and <code>q</code> are found in different subtrees of a node, that node is the LCA.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root; <span class="cc">// found one or hit null</span>
    TreeNode left = lowestCommonAncestor(root.left, p, q);
    TreeNode right = lowestCommonAncestor(root.right, p, q);
    if (left != null &amp;&amp; right != null) return root; <span class="cc">// p, q on both sides -&gt; LCA</span>
    return left != null ? left : right;             <span class="cc">// both on one side</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(h)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[3,5,1,6,2,0,8], p=5, q=1</code>: 5 found in left, 1 in right of root 3 → LCA = <strong>3</strong> ✓. For p=5,q=4 (4 under 5) → LCA = 5.</p>

      <div class="ans-callout tip"><span class="ans-callout-label">BST version (LC 235)</span>In a BST, walk down: if both &lt; node go left, both &gt; node go right, else current node is the LCA — O(h) without full recursion.</div>

      <h3>Key Takeaways</h3>
      <ul><li>LCA = node where p and q appear in different subtrees.</li><li>Returning the node itself when matched handles ancestor-descendant pairs.</li></ul>`
  },

  "230": {
    id: "LC #230", title: "Kth Smallest Element in a BST", difficulty: "Medium", topic: "BST · Inorder",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Inorder traversal</span>
        <span class="ans-chip">Sorted order</span>
        <span class="ans-chip">Time O(h+k)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the k-th smallest value in a BST. An <strong>inorder traversal</strong> visits nodes in ascending order, so the k-th visited node is the answer. Stop early once k nodes are counted.</p>

      <h3>Java Code (Optimal — iterative inorder)</h3>
      <pre class="code-block">public int kthSmallest(TreeNode root, int k) {
    Deque&lt;TreeNode&gt; stack = new ArrayDeque&lt;&gt;();
    TreeNode cur = root;
    while (cur != null || !stack.isEmpty()) {
        while (cur != null) { stack.push(cur); cur = cur.left; } <span class="cc">// go left</span>
        cur = stack.pop();
        if (--k == 0) return cur.val;       <span class="cc">// k-th smallest</span>
        cur = cur.right;                     <span class="cc">// then right</span>
    }
    return -1;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(h + k)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(h)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[3,1,4,null,2], k=1</code>: inorder 1,2,3,4 → 1st smallest = <strong>1</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Follow-up</span>If the BST is modified often and you need frequent kth queries, augment nodes with subtree sizes for O(h) lookup.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Inorder of a BST is sorted; the k-th node is the answer.</li><li>Iterative inorder lets you stop as soon as k is reached.</li></ul>`
  },

  "105": {
    id: "LC #105", title: "Construct Binary Tree from Preorder and Inorder", difficulty: "Medium", topic: "Tree · Construction",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Divide & conquer</span>
        <span class="ans-chip">Index map</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Rebuild a tree from its preorder and inorder traversals (distinct values). Preorder gives the root first; inorder splits nodes into left/right subtrees around that root. A value→index map on inorder makes the split O(1).</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">private int preIdx = 0;
private Map&lt;Integer, Integer&gt; inPos = new HashMap&lt;&gt;();
public TreeNode buildTree(int[] preorder, int[] inorder) {
    for (int i = 0; i &lt; inorder.length; i++) inPos.put(inorder[i], i);
    return build(preorder, 0, inorder.length - 1);
}
private TreeNode build(int[] pre, int lo, int hi) {
    if (lo &gt; hi) return null;
    int rootVal = pre[preIdx++];               <span class="cc">// next preorder value = root</span>
    TreeNode root = new TreeNode(rootVal);
    int mid = inPos.get(rootVal);              <span class="cc">// split point in inorder</span>
    root.left = build(pre, lo, mid - 1);       <span class="cc">// left first (preorder order)</span>
    root.right = build(pre, mid + 1, hi);
    return root;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span> map + recursion</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>pre=[3,9,20,15,7], in=[9,3,15,20,7]: root 3 (inorder idx1) → left [9], right [15,20,7] → root 20 → … reconstructs original ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Building right before left (preorder is root-left-right). (2) Re-scanning inorder for the root each time → O(n²); the index map fixes it.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Variant</span>From inorder + postorder (LC 106): consume postorder from the <em>end</em> and build right before left.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Preorder gives roots in order; inorder splits subtrees.</li><li>Index map turns the split into O(1).</li></ul>`
  },

  "297": {
    id: "LC #297", title: "Serialize and Deserialize Binary Tree", difficulty: "Hard", topic: "Tree · Serialization",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Preorder + null markers</span>
        <span class="ans-chip">BFS/DFS</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Encode a tree to a string and decode it back. Preorder DFS with explicit <strong>null markers</strong> captures structure unambiguously; deserialize by consuming tokens in the same order.</p>

      <h3>Java Code (Optimal — preorder)</h3>
      <pre class="code-block">public String serialize(TreeNode root) {
    StringBuilder sb = new StringBuilder();
    dfs(root, sb);
    return sb.toString();
}
private void dfs(TreeNode node, StringBuilder sb) {
    if (node == null) { sb.append("#,"); return; }   <span class="cc">// null marker</span>
    sb.append(node.val).append(',');
    dfs(node.left, sb);
    dfs(node.right, sb);
}
public TreeNode deserialize(String data) {
    Queue&lt;String&gt; q = new LinkedList&lt;&gt;(Arrays.asList(data.split(",")));
    return build(q);
}
private TreeNode build(Queue&lt;String&gt; q) {
    String val = q.poll();
    if (val.equals("#")) return null;
    TreeNode node = new TreeNode(Integer.parseInt(val));
    node.left = build(q);     <span class="cc">// same preorder consumption</span>
    node.right = build(q);
    return node;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time (serialize/deserialize)</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,3,null,null,4,5]</code> → <code>"1,2,#,#,3,4,#,#,5,#,#,"</code> → deserialize rebuilds the same tree ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Omitting null markers → ambiguous structure. (2) Mismatched serialize/deserialize order. (3) Negative numbers — a delimiter (comma) keeps tokens parseable.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Alternative</span>Level-order (BFS) serialization is equally valid — just be consistent on both sides.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Null markers make preorder reversible.</li><li>Deserialize by consuming tokens in the exact serialize order.</li></ul>`
  },

  "112": {
    id: "LC #112", title: "Path Sum", difficulty: "Easy", topic: "Tree · DFS",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DFS</span>
        <span class="ans-chip">Root-to-leaf</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return true if some root-to-leaf path sums to <code>targetSum</code>. DFS while subtracting node values; at a leaf, check if the remainder is zero.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public boolean hasPathSum(TreeNode root, int targetSum) {
    if (root == null) return false;
    if (root.left == null &amp;&amp; root.right == null)  <span class="cc">// leaf</span>
        return targetSum == root.val;
    int remain = targetSum - root.val;
    return hasPathSum(root.left, remain) || hasPathSum(root.right, remain);
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(h)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[5,4,8,11,null,13,4,7,2], target=22</code>: path 5→4→11→2 = 22 → <strong>true</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Checking <code>targetSum == 0</code> at null nodes — that double-counts and mishandles single-child nodes. Only test the sum at <em>leaves</em>.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Subtract down; verify remainder at leaves only.</li><li>A node with one child is not a leaf.</li></ul>`
  },

  "113": {
    id: "LC #113", title: "Path Sum II", difficulty: "Medium", topic: "Tree · Backtracking",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DFS + backtracking</span>
        <span class="ans-chip">Collect paths</span>
        <span class="ans-chip">Time O(n²)</span>
      </div>

      <h3>Overview</h3>
      <p>Return all root-to-leaf paths summing to the target. Combine the Path Sum DFS with a path list, using backtracking (add then remove) to explore each branch.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;List&lt;Integer&gt;&gt; pathSum(TreeNode root, int targetSum) {
    List&lt;List&lt;Integer&gt;&gt; res = new ArrayList&lt;&gt;();
    dfs(root, targetSum, new ArrayList&lt;&gt;(), res);
    return res;
}
private void dfs(TreeNode node, int remain, List&lt;Integer&gt; path, List&lt;List&lt;Integer&gt;&gt; res) {
    if (node == null) return;
    path.add(node.val);
    if (node.left == null &amp;&amp; node.right == null &amp;&amp; remain == node.val) {
        res.add(new ArrayList&lt;&gt;(path));      <span class="cc">// leaf with exact sum</span>
    } else {
        dfs(node.left, remain - node.val, path, res);
        dfs(node.right, remain - node.val, path, res);
    }
    path.remove(path.size() - 1);            <span class="cc">// backtrack</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n²)</span> worst (copying paths)</td></tr><tr><td>Space</td><td><span class="ans-cx">O(h)</span> + output</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[5,4,8,11,null,13,4,7,2,null,null,5,1], target=22</code> → [[5,4,11,2],[5,8,4,5]] ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Adding <code>path</code> by reference, or forgetting the <code>path.remove</code> backtrack step → corrupted/duplicated results.</div>

      <h3>Key Takeaways</h3>
      <ul><li>DFS + backtracking collects qualifying root-to-leaf paths.</li><li>Store a copy of the path at matching leaves.</li></ul>`
  },

  "129": {
    id: "LC #129", title: "Sum Root to Leaf Numbers", difficulty: "Medium", topic: "Tree · DFS",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DFS</span>
        <span class="ans-chip">Build number down</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Each root-to-leaf path forms a number (digits along the path); sum all such numbers. Carry the running number down the recursion: <code>cur = cur * 10 + node.val</code>, and add it at each leaf.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int sumNumbers(TreeNode root) {
    return dfs(root, 0);
}
private int dfs(TreeNode node, int cur) {
    if (node == null) return 0;
    cur = cur * 10 + node.val;               <span class="cc">// extend the number</span>
    if (node.left == null &amp;&amp; node.right == null) return cur; <span class="cc">// leaf -&gt; full number</span>
    return dfs(node.left, cur) + dfs(node.right, cur);
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(h)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,3]</code> → paths 12 and 13 → sum <strong>25</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Pattern</span>"Build a value while descending, finalize at leaves" recurs in many tree problems (binary path numbers, path products, etc.).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Accumulate <code>cur*10 + val</code> down each path.</li><li>Sum the values produced at leaves.</li></ul>`
  },

  "124": {
    id: "LC #124", title: "Binary Tree Maximum Path Sum", difficulty: "Hard", topic: "Tree · DFS Global Max",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DFS gain</span>
        <span class="ans-chip">Global max</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the maximum path sum where a path is any node sequence connected by edges (need not pass through the root). At each node, the best path <em>through</em> it = node + max(0, leftGain) + max(0, rightGain). The value returned to the parent can only extend one side.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">private int maxSum = Integer.MIN_VALUE;
public int maxPathSum(TreeNode root) {
    gain(root);
    return maxSum;
}
private int gain(TreeNode node) {
    if (node == null) return 0;
    int left = Math.max(0, gain(node.left));   <span class="cc">// drop negative branches</span>
    int right = Math.max(0, gain(node.right));
    maxSum = Math.max(maxSum, node.val + left + right); <span class="cc">// path through node</span>
    return node.val + Math.max(left, right);   <span class="cc">// extend ONE side to parent</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(h)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[-10,9,20,null,null,15,7]</code>: at 20, left 15 + right 7 + 20 = 42 → maxSum <strong>42</strong> ✓ (root -10 not included).</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Initializing maxSum to 0 — fails on all-negative trees (answer can be negative). (2) Returning <code>left+right+val</code> to the parent — a parent path can only use one child branch.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Key distinction</span>"Through node" (update global) uses both sides; "return to parent" uses one side. This split is the crux of the problem.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Clamp negative child gains to 0.</li><li>Update global with both sides; return only one side upward.</li></ul>`
  }

});

/* ════════════════════════ HEAP ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "1046": {
    id: "LC #1046", title: "Last Stone Weight", difficulty: "Easy", topic: "Heap · Max-Heap",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Max-heap</span>
        <span class="ans-chip">Simulation</span>
        <span class="ans-chip">Time O(n log n)</span>
      </div>

      <h3>Overview</h3>
      <p>Repeatedly smash the two heaviest stones; if unequal, the difference returns to the pile. Return the last remaining weight (or 0). A <strong>max-heap</strong> always gives the two largest in O(log n).</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int lastStoneWeight(int[] stones) {
    PriorityQueue&lt;Integer&gt; heap = new PriorityQueue&lt;&gt;(Collections.reverseOrder());
    for (int s : stones) heap.offer(s);
    while (heap.size() &gt; 1) {
        int a = heap.poll();    <span class="cc">// heaviest</span>
        int b = heap.poll();    <span class="cc">// second heaviest</span>
        if (a != b) heap.offer(a - b); <span class="cc">// remainder back</span>
    }
    return heap.isEmpty() ? 0 : heap.peek();
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n log n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[2,7,4,1,8,1]</code> → smash 8,7→1; 4,2→2; 2,1→1; 1,1→0; left 1 → <strong>1</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Max-heap in Java</span><code>new PriorityQueue&lt;&gt;(Collections.reverseOrder())</code> — Java's default is a min-heap.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Max-heap repeatedly yields the two largest.</li><li>Push the difference back until ≤1 stone remains.</li></ul>`
  },

  "215": {
    id: "LC #215", title: "Kth Largest Element in an Array", difficulty: "Medium", topic: "Heap · Quickselect",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Min-heap of size k</span>
        <span class="ans-chip">Quickselect</span>
        <span class="ans-chip">Avg O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the k-th largest element. Two strong approaches: a <strong>size-k min-heap</strong> (O(n log k)) or <strong>Quickselect</strong> (average O(n)). Quickselect is optimal on average; the heap is simpler and great for streams.</p>

      <h3>Java Code — Min-heap of size k</h3>
      <pre class="code-block">public int findKthLargest(int[] nums, int k) {
    PriorityQueue&lt;Integer&gt; heap = new PriorityQueue&lt;&gt;(); <span class="cc">// min-heap</span>
    for (int x : nums) {
        heap.offer(x);
        if (heap.size() &gt; k) heap.poll();  <span class="cc">// keep only k largest</span>
    }
    return heap.peek();                     <span class="cc">// smallest of the k largest</span>
}</pre>

      <h3>Java Code — Quickselect (average O(n))</h3>
      <pre class="code-block">public int findKthLargest(int[] nums, int k) {
    int target = nums.length - k;           <span class="cc">// k-th largest = (n-k)-th smallest</span>
    int lo = 0, hi = nums.length - 1;
    while (lo &lt; hi) {
        int p = partition(nums, lo, hi);    <span class="cc">// Lomuto/Hoare partition</span>
        if (p == target) break;
        else if (p &lt; target) lo = p + 1;
        else hi = p - 1;
    }
    return nums[target];
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Sort</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td>Min-heap (size k)</td><td><span class="ans-cx">O(n log k)</span></td><td><span class="ans-cx">O(k)</span></td></tr>
        <tr><td><strong>Quickselect</strong></td><td><span class="ans-cx">O(n) avg, O(n²) worst</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[3,2,1,5,6,4], k=2</code> → 2nd largest = <strong>5</strong>. Heap keeps {5,6}; peek 5 ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>Mention both; choose the heap for streaming/unknown size, Quickselect for one-shot best average time (randomize the pivot to avoid O(n²)).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Size-k min-heap retains the k largest; its top is the answer.</li><li>Quickselect partitions to the target rank in average O(n).</li></ul>`
  },

  "347": {
    id: "LC #347", title: "Top K Frequent Elements", difficulty: "Medium", topic: "Heap · Bucket Sort",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Frequency map</span>
        <span class="ans-chip">Heap or buckets</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return the k most frequent elements. Count frequencies, then select the top k — either with a size-k min-heap (O(n log k)) or <strong>bucket sort</strong> by frequency (O(n)).</p>

      <h3>Java Code (Optimal — bucket sort, O(n))</h3>
      <pre class="code-block">public int[] topKFrequent(int[] nums, int k) {
    Map&lt;Integer, Integer&gt; freq = new HashMap&lt;&gt;();
    for (int x : nums) freq.merge(x, 1, Integer::sum);
    <span class="cc">// bucket[f] = list of numbers with frequency f</span>
    List&lt;Integer&gt;[] buckets = new List[nums.length + 1];
    for (var e : freq.entrySet()) {
        int f = e.getValue();
        if (buckets[f] == null) buckets[f] = new ArrayList&lt;&gt;();
        buckets[f].add(e.getKey());
    }
    int[] res = new int[k]; int idx = 0;
    for (int f = buckets.length - 1; f &gt;= 0 &amp;&amp; idx &lt; k; f--) { <span class="cc">// high freq first</span>
        if (buckets[f] != null)
            for (int num : buckets[f]) { if (idx &lt; k) res[idx++] = num; }
    }
    return res;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Min-heap size k</td><td><span class="ans-cx">O(n log k)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td><strong>Bucket sort</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,1,1,2,2,3], k=2</code>: freq {1:3,2:2,3:1}; buckets[3]=[1],[2]=[2]; scan high→low → [1,2] ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Why buckets give O(n)</span>Frequencies are bounded by n, so indexing by frequency avoids the log factor of sorting/heaps.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Count, then pick top k via heap (O(n log k)) or buckets (O(n)).</li><li>Frequency is bounded by n → bucket sort applies.</li></ul>`
  },

  "973": {
    id: "LC #973", title: "K Closest Points to Origin", difficulty: "Medium", topic: "Heap · Quickselect",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Max-heap size k</span>
        <span class="ans-chip">Quickselect</span>
        <span class="ans-chip">Squared distance</span>
      </div>

      <h3>Overview</h3>
      <p>Return the k points closest to the origin. Use a <strong>max-heap of size k</strong> keyed by squared distance (no need for sqrt), or Quickselect for average O(n).</p>

      <h3>Java Code (Optimal — max-heap size k)</h3>
      <pre class="code-block">public int[][] kClosest(int[][] points, int k) {
    <span class="cc">// max-heap by distance: farthest on top so we can evict it</span>
    PriorityQueue&lt;int[]&gt; heap = new PriorityQueue&lt;&gt;(
        (a, b) -&gt; (b[0]*b[0] + b[1]*b[1]) - (a[0]*a[0] + a[1]*a[1]));
    for (int[] p : points) {
        heap.offer(p);
        if (heap.size() &gt; k) heap.poll();   <span class="cc">// drop the farthest</span>
    }
    return heap.toArray(new int[k][]);
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Sort by distance</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td>Max-heap size k</td><td><span class="ans-cx">O(n log k)</span></td><td><span class="ans-cx">O(k)</span></td></tr>
        <tr><td>Quickselect</td><td><span class="ans-cx">O(n) avg</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[1,3],[-2,2]], k=1</code>: distances² 10 and 8 → keep [-2,2] ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Skip the sqrt</span>Compare squared distances — monotonic and integer-exact, avoiding floating point.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Max-heap of size k evicts the farthest, leaving the k closest.</li><li>Use squared distance; Quickselect for best average time.</li></ul>`
  },

  "621": {
    id: "LC #621", title: "Task Scheduler", difficulty: "Medium", topic: "Heap · Greedy Math",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Greedy</span>
        <span class="ans-chip">Most frequent first</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Identical tasks need a cooldown <code>n</code> between runs. Find the minimum total time (including idles). The bottleneck is the <strong>most frequent task</strong>; a closed-form formula counts the idle slots it forces.</p>

      <h3>Formula (greedy)</h3>
      <p>Let <code>maxFreq</code> be the highest task count and <code>cntMax</code> the number of tasks sharing it. The answer is <code>max(n_tasks, (maxFreq − 1) * (n + 1) + cntMax)</code>.</p>

      <h3>Java Code (Optimal — math)</h3>
      <pre class="code-block">public int leastInterval(char[] tasks, int n) {
    int[] freq = new int[26];
    for (char t : tasks) freq[t - 'A']++;
    int maxFreq = 0;
    for (int f : freq) maxFreq = Math.max(maxFreq, f);
    int cntMax = 0;
    for (int f : freq) if (f == maxFreq) cntMax++;
    <span class="cc">// (maxFreq-1) full frames of size (n+1), plus the last partial frame</span>
    int frames = (maxFreq - 1) * (n + 1) + cntMax;
    return Math.max(tasks.length, frames);  <span class="cc">// can't be less than #tasks</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span> (26)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>["A","A","A","B","B","B"], n=2</code>: maxFreq3,cntMax2 → (3−1)*(2+1)+2 = 8 → schedule A B idle A B idle A B = <strong>8</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Heap alternative</span>A max-heap simulation (run available tasks each cooldown window) also works and naturally handles "what's the schedule" follow-ups.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Forgetting <code>max(tasks.length, frames)</code> — with many distinct tasks there are no idles and the answer is just the task count.</div>

      <h3>Key Takeaways</h3>
      <ul><li>The most frequent task sets the idle skeleton.</li><li>Answer = max(total tasks, frame formula).</li></ul>`
  },

  "295": {
    id: "LC #295", title: "Find Median from Data Stream", difficulty: "Hard", topic: "Heap · Two Heaps",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Two heaps</span>
        <span class="ans-chip">Balanced halves</span>
        <span class="ans-chip">add O(log n), median O(1)</span>
      </div>

      <h3>Overview</h3>
      <p>Support <code>addNum</code> and <code>findMedian</code> on a stream. Keep two heaps: a <strong>max-heap</strong> for the lower half and a <strong>min-heap</strong> for the upper half, balanced in size. The median is the top(s).</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">class MedianFinder {
    private PriorityQueue&lt;Integer&gt; lo = new PriorityQueue&lt;&gt;(Collections.reverseOrder()); <span class="cc">// max-heap</span>
    private PriorityQueue&lt;Integer&gt; hi = new PriorityQueue&lt;&gt;();                            <span class="cc">// min-heap</span>

    public void addNum(int num) {
        lo.offer(num);
        hi.offer(lo.poll());            <span class="cc">// funnel largest of lo into hi</span>
        if (hi.size() &gt; lo.size())       <span class="cc">// rebalance (lo may hold the extra)</span>
            lo.offer(hi.poll());
    }
    public double findMedian() {
        if (lo.size() &gt; hi.size()) return lo.peek();          <span class="cc">// odd count</span>
        return (lo.peek() + hi.peek()) / 2.0;                 <span class="cc">// even count</span>
    }
}</pre>
      <p>The cross-insertion (push to <code>lo</code>, move its max to <code>hi</code>, rebalance) keeps both halves ordered and sizes within one.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Operation</th><th>Time</th></tr></thead>
      <tbody><tr><td>addNum</td><td><span class="ans-cx">O(log n)</span></td></tr><tr><td>findMedian</td><td><span class="ans-cx">O(1)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>add 1,2,3: lo=[2,1], hi=[3] → median lo.peek()=2. add 4: balanced → median (2+3)/2... maintained correctly ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Follow-ups</span>If values are in a small range, counting/buckets give O(1). For a sliding-window median, use two balanced multisets (TreeMaps).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Max-heap (low) + min-heap (high), kept balanced.</li><li>Median is the top of the larger heap, or the average of both tops.</li></ul>`
  }

});

/* ════════════════════════ GRAPH ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "1971": {
    id: "LC #1971", title: "Find if Path Exists in Graph", difficulty: "Easy", topic: "Graph · BFS/DFS/Union-Find",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Connectivity</span>
        <span class="ans-chip">BFS / Union-Find</span>
        <span class="ans-chip">Time O(V+E)</span>
      </div>

      <h3>Overview</h3>
      <p>Determine if a path exists between <code>source</code> and <code>destination</code> in an undirected graph. Build an adjacency list and run BFS/DFS, or use Union-Find to test connectivity.</p>

      <h3>Java Code (Optimal — BFS)</h3>
      <pre class="code-block">public boolean validPath(int n, int[][] edges, int source, int destination) {
    List&lt;List&lt;Integer&gt;&gt; adj = new ArrayList&lt;&gt;();
    for (int i = 0; i &lt; n; i++) adj.add(new ArrayList&lt;&gt;());
    for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
    boolean[] seen = new boolean[n];
    Deque&lt;Integer&gt; q = new ArrayDeque&lt;&gt;();
    q.offer(source); seen[source] = true;
    while (!q.isEmpty()) {
        int node = q.poll();
        if (node == destination) return true;
        for (int nb : adj.get(node))
            if (!seen[nb]) { seen[nb] = true; q.offer(nb); }
    }
    return false;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(V + E)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(V + E)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>n=3, edges=[[0,1],[1,2],[2,0]], src=0, dst=2</code>: BFS from 0 reaches 2 → <strong>true</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Union-Find</span>For many connectivity queries on a static graph, Union-Find answers each in near-O(1) after O(E·α) preprocessing.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Adjacency list + BFS/DFS tests reachability in O(V+E).</li><li>Union-Find is ideal for repeated connectivity checks.</li></ul>`
  },

  "994": {
    id: "LC #994", title: "Rotting Oranges", difficulty: "Medium", topic: "Graph · Multi-source BFS",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Multi-source BFS</span>
        <span class="ans-chip">Level = minute</span>
        <span class="ans-chip">Time O(m·n)</span>
      </div>

      <h3>Overview</h3>
      <p>Each minute, rotten oranges (value 2) rot adjacent fresh ones (value 1). Return minutes until none are fresh, or −1 if impossible. This is <strong>multi-source BFS</strong>: seed the queue with all rotten oranges and expand level by level (each level = one minute).</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int orangesRotting(int[][] grid) {
    int m = grid.length, n = grid[0].length, fresh = 0;
    Deque&lt;int[]&gt; q = new ArrayDeque&lt;&gt;();
    for (int r = 0; r &lt; m; r++)
        for (int c = 0; c &lt; n; c++) {
            if (grid[r][c] == 2) q.offer(new int[]{r, c}); <span class="cc">// all sources</span>
            else if (grid[r][c] == 1) fresh++;
        }
    if (fresh == 0) return 0;
    int minutes = 0, [][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
    while (!q.isEmpty() &amp;&amp; fresh &gt; 0) {
        minutes++;
        for (int i = q.size(); i &gt; 0; i--) {     <span class="cc">// process one minute</span>
            int[] cur = q.poll();
            for (int[] d : dirs) {
                int nr = cur[0]+d[0], nc = cur[1]+d[1];
                if (nr&gt;=0 &amp;&amp; nc&gt;=0 &amp;&amp; nr&lt;m &amp;&amp; nc&lt;n &amp;&amp; grid[nr][nc]==1) {
                    grid[nr][nc] = 2; fresh--; q.offer(new int[]{nr, nc});
                }
            }
        }
    }
    return fresh == 0 ? minutes : -1;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(m·n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(m·n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[2,1,1],[1,1,0],[0,1,1]]</code> → 4 minutes ✓. If a fresh orange is unreachable → −1.</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Single-source BFS — must seed ALL rotten cells. (2) Forgetting the <code>fresh == 0</code> early return (answer 0). (3) Counting an extra minute — guard the loop on <code>fresh &gt; 0</code>.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Seed BFS with every source; each level is one time step.</li><li>Track remaining fresh count to detect impossibility.</li></ul>`
  },

  "133": {
    id: "LC #133", title: "Clone Graph", difficulty: "Medium", topic: "Graph · DFS/BFS + HashMap",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Deep copy</span>
        <span class="ans-chip">old→new map</span>
        <span class="ans-chip">Time O(V+E)</span>
      </div>

      <h3>Overview</h3>
      <p>Deep-copy a connected undirected graph. A HashMap from original node to its clone prevents infinite loops on cycles and ensures each node is cloned once.</p>

      <h3>Java Code (Optimal — DFS)</h3>
      <pre class="code-block">private Map&lt;Node, Node&gt; map = new HashMap&lt;&gt;();
public Node cloneGraph(Node node) {
    if (node == null) return null;
    if (map.containsKey(node)) return map.get(node); <span class="cc">// already cloned</span>
    Node clone = new Node(node.val);
    map.put(node, clone);                            <span class="cc">// register BEFORE recursing</span>
    for (Node nb : node.neighbors)
        clone.neighbors.add(cloneGraph(nb));         <span class="cc">// clone neighbors</span>
    return clone;
}</pre>
      <p>Registering the clone in the map <em>before</em> recursing on neighbors is what breaks cycles.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(V + E)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(V)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>Square graph 1-2-3-4-1: clone 1, recurse 2 (clone), 3, 4; when 4's neighbor 1 is hit, the map returns the existing clone → no infinite loop ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Recursing before putting the clone in the map → infinite recursion on cycles.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Map original→clone; register before exploring neighbors.</li><li>Works with DFS or BFS in O(V+E).</li></ul>`
  },

  "207": {
    id: "LC #207", title: "Course Schedule", difficulty: "Medium", topic: "Graph · Topological Sort",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Cycle detection</span>
        <span class="ans-chip">Kahn's BFS</span>
        <span class="ans-chip">Time O(V+E)</span>
      </div>

      <h3>Overview</h3>
      <p>Can you finish all courses given prerequisites? This is detecting whether a directed graph is acyclic. <strong>Kahn's algorithm</strong> (BFS on in-degrees) succeeds iff a valid topological order exists (no cycle).</p>

      <h3>Java Code (Optimal — Kahn's)</h3>
      <pre class="code-block">public boolean canFinish(int numCourses, int[][] prerequisites) {
    List&lt;List&lt;Integer&gt;&gt; adj = new ArrayList&lt;&gt;();
    int[] indeg = new int[numCourses];
    for (int i = 0; i &lt; numCourses; i++) adj.add(new ArrayList&lt;&gt;());
    for (int[] p : prerequisites) { adj.get(p[1]).add(p[0]); indeg[p[0]]++; }
    Deque&lt;Integer&gt; q = new ArrayDeque&lt;&gt;();
    for (int i = 0; i &lt; numCourses; i++) if (indeg[i] == 0) q.offer(i);
    int done = 0;
    while (!q.isEmpty()) {
        int c = q.poll(); done++;
        for (int next : adj.get(c))
            if (--indeg[next] == 0) q.offer(next);  <span class="cc">// prerequisite satisfied</span>
    }
    return done == numCourses;   <span class="cc">// all taken -&gt; acyclic</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(V + E)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(V + E)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>2, [[1,0]]</code>: take 0 then 1 → done=2 → <strong>true</strong>. <code>[[1,0],[0,1]]</code>: cycle, no zero in-degree start → done&lt;2 → false ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">DFS alternative</span>3-color DFS (white/gray/black) detects a back edge (cycle). Kahn's is often cleaner and yields the order directly.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Schedulable ⇔ DAG ⇔ all nodes pop from Kahn's queue.</li><li>In-degree 0 nodes are courses with no remaining prerequisites.</li></ul>`
  },

  "210": {
    id: "LC #210", title: "Course Schedule II", difficulty: "Medium", topic: "Graph · Topological Sort",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Topological order</span>
        <span class="ans-chip">Kahn's BFS</span>
        <span class="ans-chip">Time O(V+E)</span>
      </div>

      <h3>Overview</h3>
      <p>Return a valid order to finish all courses, or an empty array if impossible (cycle). Same as LC 207 but record the order in which nodes are removed.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int[] findOrder(int numCourses, int[][] prerequisites) {
    List&lt;List&lt;Integer&gt;&gt; adj = new ArrayList&lt;&gt;();
    int[] indeg = new int[numCourses];
    for (int i = 0; i &lt; numCourses; i++) adj.add(new ArrayList&lt;&gt;());
    for (int[] p : prerequisites) { adj.get(p[1]).add(p[0]); indeg[p[0]]++; }
    Deque&lt;Integer&gt; q = new ArrayDeque&lt;&gt;();
    for (int i = 0; i &lt; numCourses; i++) if (indeg[i] == 0) q.offer(i);
    int[] order = new int[numCourses]; int idx = 0;
    while (!q.isEmpty()) {
        int c = q.poll(); order[idx++] = c;     <span class="cc">// append to topo order</span>
        for (int next : adj.get(c))
            if (--indeg[next] == 0) q.offer(next);
    }
    return idx == numCourses ? order : new int[0]; <span class="cc">// cycle -&gt; empty</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(V + E)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(V + E)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>4, [[1,0],[2,0],[3,1],[3,2]]</code> → e.g. [0,1,2,3] (a valid topo order) ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Multiple answers</span>Any valid topological order is accepted; the exact sequence depends on queue ordering.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Kahn's removal order is a topological sort.</li><li>Incomplete order ⇒ cycle ⇒ return empty.</li></ul>`
  },

  "gfg-graph-tree": {
    id: "GFG", title: "Is Graph a Tree?", difficulty: "Medium", topic: "Graph · Cycle + Connectivity",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">No cycle</span>
        <span class="ans-chip">Fully connected</span>
        <span class="ans-chip">Time O(V+E)</span>
      </div>

      <h3>Overview</h3>
      <p>An undirected graph is a tree iff it is <strong>connected</strong> and has <strong>no cycle</strong>. Equivalently: connected and exactly <code>V − 1</code> edges. DFS/BFS (or Union-Find) checks both conditions.</p>

      <h3>Java Code (Optimal — DFS)</h3>
      <pre class="code-block">public boolean isTree(int V, List&lt;List&lt;Integer&gt;&gt; adj) {
    boolean[] visited = new boolean[V];
    if (hasCycle(0, -1, adj, visited)) return false; <span class="cc">// cycle -&gt; not a tree</span>
    for (boolean v : visited) if (!v) return false;  <span class="cc">// disconnected -&gt; not a tree</span>
    return true;
}
private boolean hasCycle(int node, int parent, List&lt;List&lt;Integer&gt;&gt; adj, boolean[] visited) {
    visited[node] = true;
    for (int nb : adj.get(node)) {
        if (!visited[nb]) {
            if (hasCycle(nb, node, adj, visited)) return true;
        } else if (nb != parent) {
            return true;          <span class="cc">// visited non-parent neighbor -&gt; cycle</span>
        }
    }
    return false;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(V + E)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(V)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>V=4, edges {0-1,0-2,0-3}: DFS from 0 visits all, no back edge → connected &amp; acyclic → <strong>tree</strong> ✓. Adding edge 1-2 creates a cycle → false.</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Quick check</span>If edges ≠ V−1, it can't be a tree — but you still need the connectivity check (V−1 edges + a cycle would leave a disconnected vertex).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Tree = connected + acyclic (= connected + V−1 edges).</li><li>Track <code>parent</code> to ignore the edge you came from.</li></ul>`
  },

  "417": {
    id: "LC #417", title: "Pacific Atlantic Water Flow", difficulty: "Medium", topic: "Graph · Reverse DFS",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Multi-source DFS</span>
        <span class="ans-chip">Reverse flow</span>
        <span class="ans-chip">Time O(m·n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find cells from which water can reach <strong>both</strong> oceans. Water flows to equal-or-lower neighbors. Instead of simulating from every cell, run DFS <strong>backward</strong> from each ocean's border (climbing to equal-or-higher cells); the intersection is the answer.</p>

      <h3>Key Insight</h3>
      <p>Reverse the flow: a cell drains to the Pacific iff the Pacific's edge can reach it going uphill. Compute reachability from both oceans, then intersect.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public List&lt;List&lt;Integer&gt;&gt; pacificAtlantic(int[][] h) {
    int m = h.length, n = h[0].length;
    boolean[][] pac = new boolean[m][n], atl = new boolean[m][n];
    for (int r = 0; r &lt; m; r++) { dfs(h, r, 0, pac); dfs(h, r, n-1, atl); }     <span class="cc">// left/right edges</span>
    for (int c = 0; c &lt; n; c++) { dfs(h, 0, c, pac); dfs(h, m-1, c, atl); }     <span class="cc">// top/bottom edges</span>
    List&lt;List&lt;Integer&gt;&gt; res = new ArrayList&lt;&gt;();
    for (int r = 0; r &lt; m; r++)
        for (int c = 0; c &lt; n; c++)
            if (pac[r][c] &amp;&amp; atl[r][c]) res.add(List.of(r, c)); <span class="cc">// reaches both</span>
    return res;
}
private void dfs(int[][] h, int r, int c, boolean[][] seen) {
    seen[r][c] = true;
    int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
    for (int[] d : dirs) {
        int nr = r+d[0], nc = c+d[1];
        if (nr&gt;=0 &amp;&amp; nc&gt;=0 &amp;&amp; nr&lt;h.length &amp;&amp; nc&lt;h[0].length
            &amp;&amp; !seen[nr][nc] &amp;&amp; h[nr][nc] &gt;= h[r][c]) {  <span class="cc">// uphill (reverse flow)</span>
            dfs(h, nr, nc, seen);
        }
    }
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(m·n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(m·n)</span></td></tr></tbody></table>

      <div class="ans-callout tip"><span class="ans-callout-label">Why reverse</span>Forward simulation from each cell is O((mn)²). Reverse DFS from the borders touches each cell O(1) times → O(mn).</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Flow condition direction — when going reverse you move to <code>≥</code> neighbors (uphill), not <code>≤</code>.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Reverse the problem: DFS uphill from ocean borders.</li><li>Answer = cells reachable from both oceans.</li></ul>`
  },

  "743": {
    id: "LC #743", title: "Network Delay Time", difficulty: "Medium", topic: "Graph · Dijkstra",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Dijkstra</span>
        <span class="ans-chip">Min-heap</span>
        <span class="ans-chip">Time O(E log V)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the time for a signal from node <code>k</code> to reach all nodes (the maximum shortest-path distance), or −1 if some node is unreachable. Classic single-source shortest path with non-negative weights → <strong>Dijkstra</strong>.</p>

      <h3>Java Code (Optimal — Dijkstra)</h3>
      <pre class="code-block">public int networkDelayTime(int[][] times, int n, int k) {
    List&lt;int[]&gt;[] adj = new List[n + 1];
    for (int i = 1; i &lt;= n; i++) adj[i] = new ArrayList&lt;&gt;();
    for (int[] t : times) adj[t[0]].add(new int[]{t[1], t[2]}); <span class="cc">// (to, weight)</span>
    int[] dist = new int[n + 1];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[k] = 0;
    PriorityQueue&lt;int[]&gt; pq = new PriorityQueue&lt;&gt;((a, b) -&gt; a[1] - b[1]); <span class="cc">// (node, dist)</span>
    pq.offer(new int[]{k, 0});
    while (!pq.isEmpty()) {
        int[] cur = pq.poll();
        if (cur[1] &gt; dist[cur[0]]) continue;        <span class="cc">// stale entry</span>
        for (int[] e : adj[cur[0]]) {
            int nd = cur[1] + e[1];
            if (nd &lt; dist[e[0]]) { dist[e[0]] = nd; pq.offer(new int[]{e[0], nd}); }
        }
    }
    int ans = 0;
    for (int i = 1; i &lt;= n; i++) ans = Math.max(ans, dist[i]);
    return ans == Integer.MAX_VALUE ? -1 : ans;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(E log V)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(V + E)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>times=[[2,1,1],[2,3,1],[3,4,1]], n=4, k=2</code>: dist 2→0,1→1,3→1,4→2 → max <strong>2</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Answer = max distance</span>The signal reaches everyone only when the farthest node is reached, so the answer is the maximum shortest-path distance.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Dijkstra with a min-heap for non-negative weights.</li><li>Skip stale heap entries with the <code>cur[1] &gt; dist</code> check.</li></ul>`
  },

  "787": {
    id: "LC #787", title: "Cheapest Flights Within K Stops", difficulty: "Medium", topic: "Graph · Bellman-Ford",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Bellman-Ford</span>
        <span class="ans-chip">≤ k+1 edges</span>
        <span class="ans-chip">Time O(k·E)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the cheapest price from <code>src</code> to <code>dst</code> using at most <code>k</code> stops. The stop constraint makes plain Dijkstra awkward; <strong>Bellman-Ford</strong> limited to <code>k+1</code> relaxation rounds fits perfectly.</p>

      <h3>Java Code (Optimal — Bellman-Ford)</h3>
      <pre class="code-block">public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    for (int i = 0; i &lt;= k; i++) {                  <span class="cc">// k stops = k+1 edges</span>
        int[] tmp = dist.clone();                  <span class="cc">// use last round's values only</span>
        for (int[] f : flights) {
            int u = f[0], v = f[1], w = f[2];
            if (dist[u] != Integer.MAX_VALUE &amp;&amp; dist[u] + w &lt; tmp[v]) {
                tmp[v] = dist[u] + w;
            }
        }
        dist = tmp;
    }
    return dist[dst] == Integer.MAX_VALUE ? -1 : dist[dst];
}</pre>
      <p>Cloning <code>dist</code> each round ensures each iteration uses only paths with one more edge — enforcing the stop limit.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(k · E)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>n=3, flights=[[0,1,100],[1,2,100],[0,2,500]], src=0,dst=2,k=1</code>: with 1 stop, 0→1→2 = 200 &lt; direct 500 → <strong>200</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Why clone dist</span>Without the per-round snapshot, a single iteration could chain multiple edges, violating the k-stop limit (and undercounting cost).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Bellman-Ford with k+1 rounds caps the number of edges/stops.</li><li>Snapshot distances each round to respect the limit.</li></ul>`
  },

  "399": {
    id: "LC #399", title: "Evaluate Division", difficulty: "Medium", topic: "Graph · Weighted DFS / Union-Find",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Weighted graph</span>
        <span class="ans-chip">DFS path product</span>
        <span class="ans-chip">Time O(Q·(V+E))</span>
      </div>

      <h3>Overview</h3>
      <p>Given equations like <code>a/b = 2</code>, answer queries like <code>a/c</code>. Model variables as graph nodes and each equation as two directed weighted edges (<code>a→b = 2</code>, <code>b→a = 0.5</code>). A query is the <strong>product of weights</strong> along a path.</p>

      <h3>Java Code (Optimal — DFS)</h3>
      <pre class="code-block">public double[] calcEquation(List&lt;List&lt;String&gt;&gt; eq, double[] vals,
                             List&lt;List&lt;String&gt;&gt; queries) {
    Map&lt;String, Map&lt;String, Double&gt;&gt; g = new HashMap&lt;&gt;();
    for (int i = 0; i &lt; eq.size(); i++) {
        String a = eq.get(i).get(0), b = eq.get(i).get(1);
        g.computeIfAbsent(a, x -&gt; new HashMap&lt;&gt;()).put(b, vals[i]);
        g.computeIfAbsent(b, x -&gt; new HashMap&lt;&gt;()).put(a, 1.0 / vals[i]);
    }
    double[] res = new double[queries.size()];
    for (int i = 0; i &lt; queries.size(); i++) {
        String a = queries.get(i).get(0), b = queries.get(i).get(1);
        if (!g.containsKey(a) || !g.containsKey(b)) res[i] = -1.0;
        else res[i] = dfs(a, b, 1.0, g, new HashSet&lt;&gt;());
    }
    return res;
}
private double dfs(String cur, String dst, double acc,
                   Map&lt;String, Map&lt;String, Double&gt;&gt; g, Set&lt;String&gt; seen) {
    if (cur.equals(dst)) return acc;
    seen.add(cur);
    for (var e : g.get(cur).entrySet()) {
        if (!seen.contains(e.getKey())) {
            double r = dfs(e.getKey(), dst, acc * e.getValue(), g, seen);
            if (r != -1.0) return r;
        }
    }
    return -1.0;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(Q·(V+E))</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(V+E)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>a/b=2, b/c=3</code>, query <code>a/c</code>: path a→b(2)→c(3) → product <strong>6</strong> ✓. Unknown variable → −1.</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Union-Find variant</span>Weighted Union-Find stores the ratio to each root, answering queries in near-O(1) after building.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Equations → bidirectional weighted edges (value and reciprocal).</li><li>Query = product of weights along any connecting path.</li></ul>`
  },

  "1584": {
    id: "LC #1584", title: "Min Cost to Connect All Points", difficulty: "Medium", topic: "Graph · MST (Prim's)",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Minimum Spanning Tree</span>
        <span class="ans-chip">Prim's</span>
        <span class="ans-chip">Manhattan distance</span>
      </div>

      <h3>Overview</h3>
      <p>Connect all points with minimum total cost, where edge cost is the Manhattan distance. This is a <strong>Minimum Spanning Tree</strong> on a complete graph — Prim's with a min-heap is a natural fit.</p>

      <h3>Java Code (Optimal — Prim's)</h3>
      <pre class="code-block">public int minCostConnectPoints(int[][] points) {
    int n = points.length, total = 0, used = 0;
    boolean[] inMST = new boolean[n];
    PriorityQueue&lt;int[]&gt; pq = new PriorityQueue&lt;&gt;((a, b) -&gt; a[1] - b[1]); <span class="cc">// (node, cost)</span>
    pq.offer(new int[]{0, 0});
    while (used &lt; n) {
        int[] cur = pq.poll();
        if (inMST[cur[0]]) continue;     <span class="cc">// already connected</span>
        inMST[cur[0]] = true; total += cur[1]; used++;
        for (int j = 0; j &lt; n; j++) {
            if (!inMST[j]) {
                int cost = Math.abs(points[cur[0]][0]-points[j][0])
                         + Math.abs(points[cur[0]][1]-points[j][1]);
                pq.offer(new int[]{j, cost});
            }
        }
    }
    return total;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Prim's (heap, dense)</td><td><span class="ans-cx">O(n² log n)</span></td><td><span class="ans-cx">O(n²)</span></td></tr>
        <tr><td>Kruskal's + Union-Find</td><td><span class="ans-cx">O(n² log n)</span></td><td><span class="ans-cx">O(n²)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[0,0],[2,2],[3,10],[5,2],[7,0]]</code> → MST total cost <strong>20</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Prim vs Kruskal</span>The graph is complete (dense), so Prim's is convenient. Kruskal's needs all O(n²) edges sorted + Union-Find — also valid.</div>

      <h3>Key Takeaways</h3>
      <ul><li>"Connect all with min cost" = Minimum Spanning Tree.</li><li>Prim's grows the tree via a min-heap of candidate edges.</li></ul>`
  }

});

/* ════════════════════════ DYNAMIC PROGRAMMING ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "509": {
    id: "LC #509", title: "Fibonacci Number", difficulty: "Easy", topic: "DP · 1D",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DP intro</span>
        <span class="ans-chip">Rolling variables</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p><code>F(n) = F(n-1) + F(n-2)</code>. The perfect introduction to DP: naive recursion is exponential due to repeated subproblems; memoization or a bottom-up rolling computation makes it O(n).</p>

      <h3>Java Code (Optimal — O(1) space)</h3>
      <pre class="code-block">public int fib(int n) {
    if (n &lt; 2) return n;
    int prev2 = 0, prev1 = 1;
    for (int i = 2; i &lt;= n; i++) {
        int cur = prev1 + prev2;   <span class="cc">// F(i)</span>
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Naive recursion</td><td><span class="ans-cx">O(2ⁿ)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td>Memoization</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td><strong>Rolling variables</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p>n=5: 0,1,1,2,3,5 → <strong>5</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">DP foundation</span>Overlapping subproblems + optimal substructure = DP. Fibonacci is the minimal example; the same "keep only what you need" reduces many 1D DPs to O(1) space.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Only the last two values are needed → O(1) space.</li><li>Memoization eliminates exponential recomputation.</li></ul>`
  },

  "70": {
    id: "LC #70", title: "Climbing Stairs", difficulty: "Easy", topic: "DP · 1D",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DP</span>
        <span class="ans-chip">Fibonacci pattern</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Climb <code>n</code> stairs taking 1 or 2 steps; count distinct ways. Ways to reach step <code>i</code> = ways(i−1) + ways(i−2) — it's Fibonacci.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int climbStairs(int n) {
    if (n &lt;= 2) return n;
    int one = 2, two = 1;        <span class="cc">// ways to reach step 2 and step 1</span>
    for (int i = 3; i &lt;= n; i++) {
        int cur = one + two;
        two = one;
        one = cur;
    }
    return one;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>n=3: ways = ways(2)+ways(1) = 2+1 = <strong>3</strong> (1+1+1, 1+2, 2+1) ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Recognize the recurrence</span>Spotting "current = sum of a few previous states" is the core DP skill. Steps of {1,2,3} → tribonacci, etc.</div>

      <h3>Key Takeaways</h3>
      <ul><li>ways(i) = ways(i−1) + ways(i−2) — Fibonacci.</li><li>Roll two variables for O(1) space.</li></ul>`
  },

  "746": {
    id: "LC #746", title: "Min Cost Climbing Stairs", difficulty: "Easy", topic: "DP · 1D",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DP</span>
        <span class="ans-chip">Min of two states</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Each step has a cost; from a step you climb 1 or 2. Start from index 0 or 1; reach "the top" (past the last step) with minimum total cost. <code>dp[i]</code> = min cost to reach step <code>i</code>.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int minCostClimbingStairs(int[] cost) {
    int n = cost.length;
    int prev2 = 0, prev1 = 0;     <span class="cc">// cost to reach steps 0 and 1 is 0 (free start)</span>
    for (int i = 2; i &lt;= n; i++) {
        int cur = Math.min(prev1 + cost[i-1], prev2 + cost[i-2]);
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;                 <span class="cc">// reaching "top" = index n</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[10,15,20]</code>: reach top via min(15+20, 10+...) → best <strong>15</strong> (start at index1, pay 15, jump 2 to top) ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Confusing "reach top" (index n) vs "reach last step" (index n−1). You pay the cost when leaving a step, and the top is one past the array.</div>

      <h3>Key Takeaways</h3>
      <ul><li>dp[i] = min(dp[i−1]+cost[i−1], dp[i−2]+cost[i−2]).</li><li>Target is index n (the top), not n−1.</li></ul>`
  },

  "62": {
    id: "LC #62", title: "Unique Paths", difficulty: "Easy", topic: "DP · 2D Grid",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">2D DP</span>
        <span class="ans-chip">Combinatorics</span>
        <span class="ans-chip">Time O(m·n)</span>
      </div>

      <h3>Overview</h3>
      <p>Count paths from top-left to bottom-right of an <code>m×n</code> grid moving only right or down. <code>dp[i][j] = dp[i-1][j] + dp[i][j-1]</code>. Can compress to a 1D rolling row.</p>

      <h3>Java Code (Optimal — 1D)</h3>
      <pre class="code-block">public int uniquePaths(int m, int n) {
    int[] row = new int[n];
    Arrays.fill(row, 1);              <span class="cc">// first row: one way each</span>
    for (int i = 1; i &lt; m; i++)
        for (int j = 1; j &lt; n; j++)
            row[j] += row[j - 1];     <span class="cc">// from above (row[j]) + from left (row[j-1])</span>
    return row[n - 1];
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>2D DP</td><td><span class="ans-cx">O(m·n)</span></td><td><span class="ans-cx">O(m·n)</span></td></tr>
        <tr><td><strong>1D rolling</strong></td><td><span class="ans-cx">O(m·n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td>Combinatorics C(m+n-2, m-1)</td><td><span class="ans-cx">O(min(m,n))</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p>m=3,n=3: row evolves [1,1,1]→[1,2,3]→[1,3,6] → <strong>6</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Math shortcut</span>It's choosing which of the (m+n−2) moves go down: C(m+n−2, m−1). Mention it for bonus points.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Each cell = paths from above + paths from left.</li><li>1D rolling row gives O(n) space.</li></ul>`
  },

  "63": {
    id: "LC #63", title: "Unique Paths II", difficulty: "Medium", topic: "DP · 2D Grid + Obstacles",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">2D DP</span>
        <span class="ans-chip">Obstacles = 0</span>
        <span class="ans-chip">Time O(m·n)</span>
      </div>

      <h3>Overview</h3>
      <p>Like Unique Paths but some cells are obstacles. An obstacle cell contributes 0 paths; otherwise the same recurrence applies.</p>

      <h3>Java Code (Optimal — 1D)</h3>
      <pre class="code-block">public int uniquePathsWithObstacles(int[][] grid) {
    int n = grid[0].length;
    int[] row = new int[n];
    row[0] = grid[0][0] == 1 ? 0 : 1;   <span class="cc">// start blocked?</span>
    for (int[] r : grid) {
        for (int j = 0; j &lt; n; j++) {
            if (r[j] == 1) row[j] = 0;          <span class="cc">// obstacle -&gt; no paths</span>
            else if (j &gt; 0) row[j] += row[j-1];  <span class="cc">// above + left</span>
        }
    }
    return row[n - 1];
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(m·n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[0,0,0],[0,1,0],[0,0,0]]</code>: the center obstacle zeroes one path source → answer <strong>2</strong> ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Not handling an obstacle at the start/end → should yield 0. Set obstacle cells to 0 before accumulating.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Obstacle cell = 0 paths; otherwise above + left.</li><li>1D rolling row still applies.</li></ul>`
  },

  "120": {
    id: "LC #120", title: "Triangle", difficulty: "Medium", topic: "DP · Bottom-up",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Bottom-up DP</span>
        <span class="ans-chip">In-place</span>
        <span class="ans-chip">Time O(n²)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the minimum path sum from top to bottom, moving to adjacent numbers below. <strong>Bottom-up</strong> is cleanest: start from the last row and fold upward — each cell becomes itself plus the smaller of its two children.</p>

      <h3>Java Code (Optimal — bottom-up, O(n) space)</h3>
      <pre class="code-block">public int minimumTotal(List&lt;List&lt;Integer&gt;&gt; triangle) {
    int n = triangle.size();
    int[] dp = new int[n + 1];                 <span class="cc">// last row + sentinel zeros</span>
    for (int r = n - 1; r &gt;= 0; r--) {
        for (int c = 0; c &lt;= r; c++) {
            dp[c] = triangle.get(r).get(c)
                  + Math.min(dp[c], dp[c + 1]); <span class="cc">// min of two children</span>
        }
    }
    return dp[0];
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n²)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(n)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[[2],[3,4],[6,5,7],[4,1,8,3]]</code> → min path 2+3+5+1 = <strong>11</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Why bottom-up</span>Going upward avoids edge cases at the triangle's borders — every cell always has exactly two children below.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Fold from the bottom: cell + min(child, child).</li><li>One row of DP suffices → O(n) space.</li></ul>`
  },

  "198": {
    id: "LC #198", title: "House Robber", difficulty: "Medium", topic: "DP · 1D",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DP</span>
        <span class="ans-chip">Take / skip</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Maximize loot without robbing two adjacent houses. At each house decide: <strong>rob it</strong> (add its value to the best up to two houses back) or <strong>skip it</strong> (carry the best up to the previous house).</p>

      <h3>Java Code (Optimal — O(1) space)</h3>
      <pre class="code-block">public int rob(int[] nums) {
    int prev2 = 0, prev1 = 0;          <span class="cc">// best up to i-2 and i-1</span>
    for (int x : nums) {
        int cur = Math.max(prev1, prev2 + x); <span class="cc">// skip vs rob</span>
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[2,7,9,3,1]</code>: best = 2,7,11,11,12 → <strong>12</strong> (rob 2,9,1) ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Recurrence</span><code>dp[i] = max(dp[i-1], dp[i-2] + nums[i])</code> — the canonical "take/skip" DP that underlies many problems.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Rob or skip; carry the best of two previous states.</li><li>Two rolling variables → O(1) space.</li></ul>`
  },

  "213": {
    id: "LC #213", title: "House Robber II", difficulty: "Medium", topic: "DP · Circular",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DP</span>
        <span class="ans-chip">Circular split</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Houses are arranged in a <strong>circle</strong>, so the first and last are adjacent. Trick: the optimal solution either excludes the first house or excludes the last — run linear House Robber twice and take the max.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int rob(int[] nums) {
    int n = nums.length;
    if (n == 1) return nums[0];
    <span class="cc">// case A: houses [0..n-2], case B: houses [1..n-1]</span>
    return Math.max(robLine(nums, 0, n - 2), robLine(nums, 1, n - 1));
}
private int robLine(int[] nums, int lo, int hi) {
    int prev2 = 0, prev1 = 0;
    for (int i = lo; i &lt;= hi; i++) {
        int cur = Math.max(prev1, prev2 + nums[i]);
        prev2 = prev1; prev1 = cur;
    }
    return prev1;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[2,3,2]</code>: caseA [2,3]→3; caseB [3,2]→3 → <strong>3</strong> ✓ (can't take both ends).</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Forgetting the single-house base case (the two ranges would both be empty/invalid).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Circular constraint → exclude first OR last, solve linearly twice.</li><li>Reuse the House Robber subroutine.</li></ul>`
  }

});

/* ════════════════════════ DYNAMIC PROGRAMMING (cont.) ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "152": {
    id: "LC #152", title: "Maximum Product Subarray", difficulty: "Medium", topic: "DP · Track Min & Max",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DP</span>
        <span class="ans-chip">Min/max swap on negatives</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the contiguous subarray with the largest product. Unlike sum, a negative number flips sign, so the current <strong>minimum</strong> can become the maximum after multiplying by a negative — track both running max and min.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int maxProduct(int[] nums) {
    int max = nums[0], min = nums[0], best = nums[0];
    for (int i = 1; i &lt; nums.length; i++) {
        int x = nums[i];
        if (x &lt; 0) { int t = max; max = min; min = t; } <span class="cc">// negative swaps roles</span>
        max = Math.max(x, max * x);
        min = Math.min(x, min * x);
        best = Math.max(best, max);
    }
    return best;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[2,3,-2,4]</code>: products track max 2,6,(swap)−2→−2,4 best stays 6 → <strong>6</strong>. <code>[-2,3,-4]</code> → 24 (all three) ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Tracking only the max. A large negative × negative yields a large positive — you must also carry the running min.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Carry both max and min; swap them on a negative.</li><li>Kadane-style O(n)/O(1).</li></ul>`
  },

  "300": {
    id: "LC #300", title: "Longest Increasing Subsequence", difficulty: "Medium", topic: "DP · Patience Sorting",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DP O(n²)</span>
        <span class="ans-chip">Binary search O(n log n)</span>
        <span class="ans-chip">Patience sorting</span>
      </div>

      <h3>Overview</h3>
      <p>Find the length of the longest strictly increasing subsequence. The O(n²) DP is intuitive; the optimal <strong>O(n log n)</strong> maintains a "tails" array via binary search (patience sorting).</p>

      <h3>Java Code — O(n²) DP</h3>
      <pre class="code-block">public int lengthOfLIS(int[] nums) {
    int[] dp = new int[nums.length];
    Arrays.fill(dp, 1);                      <span class="cc">// each element alone</span>
    int best = 1;
    for (int i = 1; i &lt; nums.length; i++)
        for (int j = 0; j &lt; i; j++)
            if (nums[j] &lt; nums[i]) {
                dp[i] = Math.max(dp[i], dp[j] + 1);
                best = Math.max(best, dp[i]);
            }
    return best;
}</pre>

      <h3>Java Code — O(n log n) (tails + binary search)</h3>
      <pre class="code-block">public int lengthOfLIS(int[] nums) {
    int[] tails = new int[nums.length];     <span class="cc">// tails[k]=smallest tail of an LIS of length k+1</span>
    int size = 0;
    for (int x : nums) {
        int lo = 0, hi = size;
        while (lo &lt; hi) {                    <span class="cc">// lower bound of x</span>
            int mid = (lo + hi) / 2;
            if (tails[mid] &lt; x) lo = mid + 1; else hi = mid;
        }
        tails[lo] = x;                       <span class="cc">// extend or replace</span>
        if (lo == size) size++;
    }
    return size;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>DP</td><td><span class="ans-cx">O(n²)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
        <tr><td><strong>Tails + binary search</strong></td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(n)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[10,9,2,5,3,7,101,18]</code>: tails grow to [2,3,7,18] → length <strong>4</strong> ✓ (the tails array isn't the actual LIS, but its size is correct).</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Tails ≠ the subsequence</span>The <code>tails</code> array gives the correct LIS length but not necessarily a valid subsequence. To reconstruct, track predecessors.</div>

      <h3>Key Takeaways</h3>
      <ul><li>O(n²) DP: dp[i] = longest ending at i.</li><li>O(n log n): binary-search the smallest tail to replace/extend.</li></ul>`
  },

  "91": {
    id: "LC #91", title: "Decode Ways", difficulty: "Medium", topic: "DP · 1D",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">DP</span>
        <span class="ans-chip">1 or 2 digit decode</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Count ways to decode a digit string where 'A'..'Z' map to "1".."26". At each position, you can take one digit (if 1–9) and/or two digits (if 10–26). It's a Fibonacci-like DP with validity guards.</p>

      <h3>Java Code (Optimal — O(1) space)</h3>
      <pre class="code-block">public int numDecodings(String s) {
    if (s.charAt(0) == '0') return 0;
    int prev2 = 1, prev1 = 1;        <span class="cc">// dp[0]=1, dp[1]=1 (first char valid)</span>
    for (int i = 1; i &lt; s.length(); i++) {
        int cur = 0;
        if (s.charAt(i) != '0') cur += prev1;            <span class="cc">// single digit 1-9</span>
        int two = (s.charAt(i-1) - '0') * 10 + (s.charAt(i) - '0');
        if (two &gt;= 10 &amp;&amp; two &lt;= 26) cur += prev2;          <span class="cc">// pair 10-26</span>
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>"226"</code>: "2|2|6","22|6","2|26" → <strong>3</strong> ✓. <code>"06"</code> → 0 (leading zero invalid).</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Not handling <code>'0'</code> — it can't stand alone and only pairs as "10"/"20". (2) Counting "07" as valid (it isn't).</div>

      <h3>Key Takeaways</h3>
      <ul><li>Add prev1 if the single digit is valid; add prev2 if the pair is 10–26.</li><li>Zeros need careful guards.</li></ul>`
  },

  "322": {
    id: "LC #322", title: "Coin Change", difficulty: "Medium", topic: "DP · Unbounded Knapsack",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Unbounded knapsack</span>
        <span class="ans-chip">Min coins</span>
        <span class="ans-chip">Time O(amount·coins)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the fewest coins summing to <code>amount</code> (coins reusable), or −1. Bottom-up DP: <code>dp[a]</code> = min coins to make amount <code>a</code> = <code>min(dp[a − coin] + 1)</code> over all coins.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);     <span class="cc">// "infinity" sentinel</span>
    dp[0] = 0;                        <span class="cc">// 0 coins make amount 0</span>
    for (int a = 1; a &lt;= amount; a++)
        for (int coin : coins)
            if (coin &lt;= a)
                dp[a] = Math.min(dp[a], dp[a - coin] + 1);
    return dp[amount] &gt; amount ? -1 : dp[amount];
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(amount · coins)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(amount)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>coins=[1,2,5], amount=11</code>: dp[11] = dp[6]+1 = (5+5+1) → <strong>3</strong> ✓. amount unreachable → −1.</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Greedy (largest coin first) — fails for coin sets like {1,3,4}, amount 6 (greedy 4+1+1=3, optimal 3+3=2). (2) Forgetting the −1 sentinel check.</div>
      <div class="ans-callout tip"><span class="ans-callout-label">Variant</span>Coin Change II (LC 518) counts the number of combinations — iterate coins in the outer loop to avoid counting permutations.</div>

      <h3>Key Takeaways</h3>
      <ul><li>dp[a] = min over coins of dp[a−coin]+1.</li><li>Greedy is wrong for arbitrary denominations; use DP.</li></ul>`
  },

  "1143": {
    id: "LC #1143", title: "Longest Common Subsequence", difficulty: "Medium", topic: "DP · 2D",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">2D DP</span>
        <span class="ans-chip">Subsequence</span>
        <span class="ans-chip">Time O(m·n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the length of the longest subsequence common to two strings. The canonical 2D DP: if characters match, extend the diagonal; otherwise take the best of dropping one character from either string.</p>

      <h3>Recurrence</h3>
      <p><code>dp[i][j]</code> = LCS of <code>a[0..i)</code> and <code>b[0..j)</code>. If <code>a[i-1]==b[j-1]</code>: <code>dp[i-1][j-1]+1</code>; else <code>max(dp[i-1][j], dp[i][j-1])</code>.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int longestCommonSubsequence(String a, String b) {
    int m = a.length(), n = b.length();
    int[][] dp = new int[m + 1][n + 1];     <span class="cc">// row/col 0 = empty prefix = 0</span>
    for (int i = 1; i &lt;= m; i++)
        for (int j = 1; j &lt;= n; j++)
            if (a.charAt(i-1) == b.charAt(j-1))
                dp[i][j] = dp[i-1][j-1] + 1;        <span class="cc">// match -&gt; diagonal +1</span>
            else
                dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]); <span class="cc">// drop one char</span>
    return dp[m][n];
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(m·n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(m·n)</span> (O(n) with rolling rows)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>a="abcde", b="ace"</code> → LCS "ace" length <strong>3</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Subsequence vs substring</span>Subsequence allows gaps (this); substring must be contiguous (that's Longest Common Substring, GFG). Different recurrences!</div>

      <h3>Key Takeaways</h3>
      <ul><li>Match → diagonal+1; mismatch → max of left/up.</li><li>The grandparent of edit-distance-style 2D DPs.</li></ul>`
  },

  "72": {
    id: "LC #72", title: "Edit Distance", difficulty: "Hard", topic: "DP · 2D",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">2D DP</span>
        <span class="ans-chip">Insert/Delete/Replace</span>
        <span class="ans-chip">Time O(m·n)</span>
      </div>

      <h3>Overview</h3>
      <p>Minimum operations (insert, delete, replace) to convert string <code>a</code> into <code>b</code> (Levenshtein distance). 2D DP where each cell is the cheapest of the three operations.</p>

      <h3>Recurrence</h3>
      <p>If <code>a[i-1]==b[j-1]</code>: <code>dp[i-1][j-1]</code> (no op). Else <code>1 + min(dp[i-1][j]</code> delete, <code>dp[i][j-1]</code> insert, <code>dp[i-1][j-1]</code> replace).</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int minDistance(String a, String b) {
    int m = a.length(), n = b.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 0; i &lt;= m; i++) dp[i][0] = i;  <span class="cc">// delete all</span>
    for (int j = 0; j &lt;= n; j++) dp[0][j] = j;  <span class="cc">// insert all</span>
    for (int i = 1; i &lt;= m; i++)
        for (int j = 1; j &lt;= n; j++)
            if (a.charAt(i-1) == b.charAt(j-1))
                dp[i][j] = dp[i-1][j-1];
            else
                dp[i][j] = 1 + Math.min(dp[i-1][j-1],            <span class="cc">// replace</span>
                                Math.min(dp[i-1][j], dp[i][j-1])); <span class="cc">// delete / insert</span>
    return dp[m][n];
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(m·n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(m·n)</span> (O(n) with rolling rows)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>"horse" → "ros"</code> = 3 (replace h→r, delete r, delete e) ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Base cases matter</span>The first row/column represent converting to/from an empty string — initialize them to indices, or the recurrence breaks.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Three operations → min of three neighbors (+1 unless chars match).</li><li>Initialize borders to prefix lengths.</li></ul>`
  },

  "gfg-lcs-substring": {
    id: "GFG", title: "Longest Common Substring", difficulty: "Medium", topic: "DP · 2D",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">2D DP</span>
        <span class="ans-chip">Contiguous</span>
        <span class="ans-chip">Time O(m·n)</span>
      </div>

      <h3>Overview</h3>
      <p>Find the length of the longest <strong>contiguous</strong> substring common to two strings. Unlike LCS (subsequence), a mismatch <strong>resets</strong> the run to 0 — and the answer is the maximum cell, not <code>dp[m][n]</code>.</p>

      <h3>Recurrence</h3>
      <p>If <code>a[i-1]==b[j-1]</code>: <code>dp[i][j] = dp[i-1][j-1] + 1</code>; else <code>dp[i][j] = 0</code>. Track the global maximum.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int longestCommonSubstr(String a, String b) {
    int m = a.length(), n = b.length(), best = 0;
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 1; i &lt;= m; i++)
        for (int j = 1; j &lt;= n; j++)
            if (a.charAt(i-1) == b.charAt(j-1)) {
                dp[i][j] = dp[i-1][j-1] + 1;     <span class="cc">// extend the run</span>
                best = Math.max(best, dp[i][j]);
            } else {
                dp[i][j] = 0;                     <span class="cc">// mismatch breaks contiguity</span>
            }
    return best;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(m·n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(m·n)</span> (O(n) with rolling rows)</td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>a="ABCDGH", b="ACDGHR"</code> → "CDGH" length <strong>4</strong> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Substring vs subsequence</span>Key difference from LCS: a mismatch resets to 0 (must be contiguous), and the answer is the running max, not the corner cell.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Match extends the diagonal run; mismatch resets to 0.</li><li>Answer = maximum dp value across the table.</li></ul>`
  }

});

/* ════════════════════════ BIT MANIPULATION ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "389": {
    id: "LC #389", title: "Find the Difference", difficulty: "Easy", topic: "Bit · XOR",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">XOR</span>
        <span class="ans-chip">Pairing cancels</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p><code>t</code> is <code>s</code> shuffled with one extra letter added. Find that letter. XOR all characters of both strings: identical characters cancel (x^x=0), leaving the added one.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public char findTheDifference(String s, String t) {
    char x = 0;
    for (char c : s.toCharArray()) x ^= c;
    for (char c : t.toCharArray()) x ^= c;  <span class="cc">// all pairs cancel</span>
    return x;                                <span class="cc">// the extra char remains</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Frequency count</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>XOR</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>s="abcd", t="abcde"</code>: XOR everything → a..d cancel → <strong>'e'</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">XOR identities</span><code>x^x=0</code>, <code>x^0=x</code>, commutative/associative — the basis of countless "find the odd one out" tricks.</div>

      <h3>Key Takeaways</h3>
      <ul><li>XOR cancels duplicates; the unmatched element survives.</li><li>O(1) space, no counting structures.</li></ul>`
  },

  "191": {
    id: "LC #191", title: "Number of 1 Bits", difficulty: "Easy", topic: "Bit · Popcount",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Brian Kernighan</span>
        <span class="ans-chip">Clear lowest set bit</span>
        <span class="ans-chip">Time O(set bits)</span>
      </div>

      <h3>Overview</h3>
      <p>Count set bits (Hamming weight). <strong>Brian Kernighan's trick</strong> — <code>n &amp; (n-1)</code> clears the lowest set bit — loops only as many times as there are 1-bits.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int hammingWeight(int n) {
    int count = 0;
    while (n != 0) {
        n &amp;= (n - 1);   <span class="cc">// drop the lowest set bit</span>
        count++;
    }
    return count;
}</pre>
      <p>Built-in <code>Integer.bitCount(n)</code> does the same; interviewers usually want the manual version.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(number of set bits)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>n=11 (1011)</code>: 1011→1010→1000→0000, 3 iterations → <strong>3</strong> ✓</p>

      <div class="ans-callout warn"><span class="ans-callout-label">Java caveat</span>Java has no unsigned int; for the "negative" inputs in this problem, the bit pattern still works because <code>&amp;</code> operates bitwise. Avoid <code>n &gt; 0</code> as a loop condition — use <code>n != 0</code>.</div>

      <h3>Key Takeaways</h3>
      <ul><li><code>n &amp; (n-1)</code> clears the lowest set bit.</li><li>Loop count = number of 1-bits.</li></ul>`
  },

  "231": {
    id: "LC #231", title: "Power of Two", difficulty: "Easy", topic: "Bit · Single Set Bit",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Bit trick</span>
        <span class="ans-chip">n & (n-1)</span>
        <span class="ans-chip">Time O(1)</span>
      </div>

      <h3>Overview</h3>
      <p>A power of two has <strong>exactly one set bit</strong>. So <code>n &gt; 0 &amp;&amp; (n &amp; (n-1)) == 0</code> tests it in O(1).</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public boolean isPowerOfTwo(int n) {
    return n &gt; 0 &amp;&amp; (n &amp; (n - 1)) == 0; <span class="cc">// one set bit, and positive</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(1)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>8 = 1000, 7 = 0111, 8&amp;7 = 0 → true. 6 = 0110, 5 = 0101, 6&amp;5 = 0100 ≠ 0 → false ✓</p>

      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Omitting <code>n &gt; 0</code>. For <code>n = 0</code>, <code>0 &amp; -1 == 0</code> would wrongly return true; negatives also slip through.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Power of two ⇔ exactly one set bit.</li><li><code>n &amp; (n-1) == 0</code> with a positivity guard.</li></ul>`
  },

  "338": {
    id: "LC #338", title: "Counting Bits", difficulty: "Easy", topic: "Bit · DP",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Bit DP</span>
        <span class="ans-chip">Reuse subresults</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Return the set-bit count for every number in <code>[0, n]</code>. DP relation: <code>count[i] = count[i &gt;&gt; 1] + (i &amp; 1)</code> — i's bits = (i without its last bit)'s bits, plus the last bit.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int[] countBits(int n) {
    int[] dp = new int[n + 1];
    for (int i = 1; i &lt;= n; i++) {
        dp[i] = dp[i &gt;&gt; 1] + (i &amp; 1); <span class="cc">// half's bits + last bit</span>
    }
    return dp;
}</pre>
      <p>Alternative relation: <code>dp[i] = dp[i &amp; (i-1)] + 1</code> (drop lowest set bit, add 1).</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>popcount each</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(1)</span></td></tr>
        <tr><td><strong>DP</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span> output</td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p>n=5: dp = [0,1,1,2,1,2] (0,1,10,11,100,101) ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Why DP beats per-number popcount</span>Reusing <code>dp[i&gt;&gt;1]</code> turns each value into O(1), giving overall O(n) instead of O(n log n).</div>

      <h3>Key Takeaways</h3>
      <ul><li>count[i] = count[i/2] + (i&amp;1).</li><li>Reusing earlier results yields O(n).</li></ul>`
  },

  "371": {
    id: "LC #371", title: "Sum of Two Integers", difficulty: "Medium", topic: "Bit · Adder",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">XOR + carry</span>
        <span class="ans-chip">No + operator</span>
        <span class="ans-chip">Time O(1)</span>
      </div>

      <h3>Overview</h3>
      <p>Add two integers without <code>+</code> or <code>-</code>. XOR gives the sum without carries; AND-then-shift gives the carries. Repeat until no carry remains — simulating a binary full adder.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int getSum(int a, int b) {
    while (b != 0) {
        int carry = (a &amp; b) &lt;&lt; 1; <span class="cc">// common bits shifted left</span>
        a = a ^ b;                <span class="cc">// add without carry</span>
        b = carry;                <span class="cc">// fold carry in next round</span>
    }
    return a;
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(1)</span> (≤32 iterations)</td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>a=2 (10), b=3 (11): sum 01, carry 100; next a=01,b=100 → a=101(5),carry0 → <strong>5</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Java helps here</span>Java's int is two's-complement and overflow wraps silently, so negative numbers and carries work without special handling.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Sum = XOR; carry = (AND)&lt;&lt;1; iterate until carry is 0.</li><li>A software full adder.</li></ul>`
  },

  "260": {
    id: "LC #260", title: "Single Number III", difficulty: "Medium", topic: "Bit · XOR Partition",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">XOR</span>
        <span class="ans-chip">Lowest set bit split</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Every element appears twice except <strong>two</strong> unique numbers. Find both in O(n) time, O(1) space. XOR everything to get <code>a^b</code>; a differing bit lets you partition the array into two groups, each XOR-ing to one answer.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int[] singleNumber(int[] nums) {
    int xorAll = 0;
    for (int x : nums) xorAll ^= x;          <span class="cc">// = a ^ b</span>
    int diffBit = xorAll &amp; (-xorAll);         <span class="cc">// lowest set bit (where a,b differ)</span>
    int a = 0, b = 0;
    for (int x : nums) {
        if ((x &amp; diffBit) == 0) a ^= x;      <span class="cc">// group without the bit</span>
        else                    b ^= x;      <span class="cc">// group with the bit</span>
    }
    return new int[]{a, b};
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,2,1,3,2,5]</code>: xorAll = 3^5 = 6 (110); lowest set bit 2; partition → groups XOR to <strong>3 and 5</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Key idea</span><code>x &amp; (-x)</code> isolates the lowest set bit. Since a≠b, they differ somewhere; that bit cleanly separates them while duplicates stay paired within a group.</div>

      <h3>Key Takeaways</h3>
      <ul><li>XOR all → a^b; isolate a differing bit to split into two groups.</li><li>Each group XORs to one unique number.</li></ul>`
  },

  "137": {
    id: "LC #137", title: "Single Number II", difficulty: "Medium", topic: "Bit · Modular Counting",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Bit counting mod 3</span>
        <span class="ans-chip">Two-state masks</span>
        <span class="ans-chip">Time O(n)</span>
      </div>

      <h3>Overview</h3>
      <p>Every element appears three times except one. Find it in O(n)/O(1). Approach: count each bit position modulo 3 — bits belonging to the unique number have a count not divisible by 3.</p>

      <h3>Java Code — Bit-count (clear)</h3>
      <pre class="code-block">public int singleNumber(int[] nums) {
    int result = 0;
    for (int i = 0; i &lt; 32; i++) {
        int sum = 0;
        for (int x : nums) sum += (x &gt;&gt; i) &amp; 1; <span class="cc">// count 1s at bit i</span>
        if (sum % 3 != 0) result |= (1 &lt;&lt; i);    <span class="cc">// unique contributes here</span>
    }
    return result;
}</pre>

      <h3>Java Code — Two-mask (optimal)</h3>
      <pre class="code-block">public int singleNumber(int[] nums) {
    int ones = 0, twos = 0;
    for (int x : nums) {
        ones = (ones ^ x) &amp; ~twos;  <span class="cc">// bits seen once (mod 3)</span>
        twos = (twos ^ x) &amp; ~ones;  <span class="cc">// bits seen twice (mod 3)</span>
    }
    return ones;                    <span class="cc">// bits seen exactly once</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody><tr><td>Time</td><td><span class="ans-cx">O(n)</span></td></tr><tr><td>Space</td><td><span class="ans-cx">O(1)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p><code>[2,2,3,2]</code>: each bit of 2 appears 3× (mod 3 = 0); bits of 3 remain → <strong>3</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Interview note</span>Lead with the bit-count version (easy to explain), then present the two-mask <code>ones/twos</code> finite-state machine as the elegant O(1) optimum.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Count bits mod 3; leftover bits form the unique number.</li><li>Two masks track "seen once/twice" as a mod-3 counter.</li></ul>`
  },

  "287": {
    id: "LC #287", title: "Find the Duplicate Number", difficulty: "Medium", topic: "Array · Floyd's Cycle",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Floyd's cycle</span>
        <span class="ans-chip">Array as linked list</span>
        <span class="ans-chip">O(1) space</span>
      </div>

      <h3>Overview</h3>
      <p><code>n+1</code> numbers in <code>[1, n]</code> contain one duplicate. Find it without modifying the array and in O(1) space. Treat values as "next" pointers (<code>i → nums[i]</code>); the duplicate creates a cycle → <strong>Floyd's algorithm</strong> finds its entrance.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">public int findDuplicate(int[] nums) {
    int slow = nums[0], fast = nums[0];
    do {                              <span class="cc">// phase 1: find meeting point</span>
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow != fast);
    slow = nums[0];                   <span class="cc">// phase 2: find cycle entrance</span>
    while (slow != fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;                      <span class="cc">// the duplicate value</span>
}</pre>

      <h3>Approaches Compared</h3>
      <table><thead><tr><th>Approach</th><th>Time</th><th>Space</th><th>Note</th></tr></thead>
      <tbody>
        <tr><td>HashSet</td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(n)</span></td><td>modifies nothing but uses space</td></tr>
        <tr><td>Sort</td><td><span class="ans-cx">O(n log n)</span></td><td><span class="ans-cx">O(1)</span></td><td>modifies array</td></tr>
        <tr><td><strong>Floyd's cycle</strong></td><td><span class="ans-cx">O(n)</span></td><td><span class="ans-cx">O(1)</span></td><td>no modification</td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p><code>[1,3,4,2,2]</code>: following indices forms a cycle entering at value 2 → <strong>2</strong> ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Why a cycle exists</span>Values in [1,n] mean every "pointer" stays in range; the duplicate makes two indices point to the same node → a cycle, whose entrance is the duplicate.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Model the array as a linked list; the duplicate is the cycle entrance.</li><li>Floyd's gives O(n)/O(1) without mutating input.</li></ul>`
  }

});

/* ════════════════════════ TRIE ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "208": {
    id: "LC #208", title: "Implement Trie (Prefix Tree)", difficulty: "Medium", topic: "Trie · Design",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Prefix tree</span>
        <span class="ans-chip">26-way children</span>
        <span class="ans-chip">O(L) ops</span>
      </div>

      <h3>Overview</h3>
      <p>Implement a trie supporting <code>insert</code>, <code>search</code>, and <code>startsWith</code>. A trie stores strings as paths of characters; each node has up to 26 children and an <code>isEnd</code> flag. All operations are O(word length), independent of how many words are stored.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">class Trie {
    private static class Node {
        Node[] children = new Node[26];
        boolean isEnd;
    }
    private final Node root = new Node();

    public void insert(String word) {
        Node cur = root;
        for (char c : word.toCharArray()) {
            int i = c - 'a';
            if (cur.children[i] == null) cur.children[i] = new Node();
            cur = cur.children[i];
        }
        cur.isEnd = true;                  <span class="cc">// mark end of a word</span>
    }
    public boolean search(String word) {
        Node node = find(word);
        return node != null &amp;&amp; node.isEnd;  <span class="cc">// full word must be marked</span>
    }
    public boolean startsWith(String prefix) {
        return find(prefix) != null;       <span class="cc">// path existence is enough</span>
    }
    private Node find(String s) {
        Node cur = root;
        for (char c : s.toCharArray()) {
            int i = c - 'a';
            if (cur.children[i] == null) return null;
            cur = cur.children[i];
        }
        return cur;
    }
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Operation</th><th>Time</th><th>Space</th></tr></thead>
      <tbody><tr><td>insert / search / startsWith</td><td><span class="ans-cx">O(L)</span></td><td><span class="ans-cx">O(total chars · 26)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>insert "app","apple": search "app"→true (isEnd), search "ap"→false (not end), startsWith "ap"→true ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">search vs startsWith</span>The only difference: <code>search</code> requires the terminal node's <code>isEnd</code> to be true; <code>startsWith</code> only needs the path to exist.</div>
      <div class="ans-callout warn"><span class="ans-callout-label">Space note</span>A 26-array per node is fast but memory-heavy; a <code>HashMap&lt;Character,Node&gt;</code> saves space for sparse alphabets.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Trie = character-path tree with an end-of-word flag.</li><li>Operations are O(word length), not O(#words).</li></ul>`
  },

  "212": {
    id: "LC #212", title: "Word Search II", difficulty: "Hard", topic: "Trie · Backtracking",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">Trie + DFS</span>
        <span class="ans-chip">Multi-word search</span>
        <span class="ans-chip">Prune dead paths</span>
      </div>

      <h3>Overview</h3>
      <p>Find all words from a dictionary that exist in a grid (Word Search for many words at once). Building a <strong>trie</strong> of the words lets a single DFS over the board match all of them simultaneously, pruning paths no word can extend.</p>

      <h3>Why a Trie</h3>
      <p>Running Word Search (LC 79) per word is O(words · cells · 4^L). A trie collapses shared prefixes so one board DFS checks every word, pruning instantly when the current path isn't a prefix of any word.</p>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">class TrieNode { TrieNode[] next = new TrieNode[26]; String word; }

public List&lt;String&gt; findWords(char[][] board, String[] words) {
    TrieNode root = new TrieNode();
    for (String w : words) {                 <span class="cc">// build trie</span>
        TrieNode cur = root;
        for (char c : w.toCharArray()) {
            if (cur.next[c-'a'] == null) cur.next[c-'a'] = new TrieNode();
            cur = cur.next[c-'a'];
        }
        cur.word = w;                        <span class="cc">// store full word at end node</span>
    }
    List&lt;String&gt; res = new ArrayList&lt;&gt;();
    for (int r = 0; r &lt; board.length; r++)
        for (int c = 0; c &lt; board[0].length; c++)
            dfs(board, r, c, root, res);
    return res;
}
private void dfs(char[][] b, int r, int c, TrieNode node, List&lt;String&gt; res) {
    if (r&lt;0 || c&lt;0 || r&gt;=b.length || c&gt;=b[0].length) return;
    char ch = b[r][c];
    if (ch == '#' || node.next[ch-'a'] == null) return; <span class="cc">// visited or no word path</span>
    node = node.next[ch-'a'];
    if (node.word != null) { res.add(node.word); node.word = null; } <span class="cc">// found, dedup</span>
    b[r][c] = '#';                            <span class="cc">// mark visited</span>
    dfs(b, r+1, c, node, res); dfs(b, r-1, c, node, res);
    dfs(b, r, c+1, node, res); dfs(b, r, c-1, node, res);
    b[r][c] = ch;                             <span class="cc">// backtrack</span>
}</pre>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Time</td><td><span class="ans-cx">O(M·N·4·3^(L-1))</span> board cells × trie paths</td></tr>
        <tr><td>Space</td><td><span class="ans-cx">O(total chars)</span> trie</td></tr>
      </tbody></table>

      <h3>Dry Run</h3>
      <p>Words ["oath","pea","eat","rain"] on a board: the trie lets one DFS find "oath" and "eat" without re-scanning per word; non-prefix paths are abandoned immediately.</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Key optimizations</span>(1) Set <code>node.word = null</code> after adding to dedup. (2) Optionally prune leaf trie nodes after a match to shrink future searches.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistake</span>Running LC 79 once per word — far too slow. The trie is what makes the multi-word search efficient.</div>

      <h3>Key Takeaways</h3>
      <ul><li>Trie merges shared prefixes → one DFS matches all words.</li><li>Store the full word at end nodes; null it out to dedup results.</li></ul>`
  }

});

/* ════════════════════════ DESIGN ════════════════════════ */
Object.assign(window.DSA_ANSWERS, {

  "146": {
    id: "LC #146", title: "LRU Cache", difficulty: "Medium", topic: "Design · HashMap + DLL",
    html: `
      <div class="ans-tag-row">
        <span class="ans-chip">HashMap + Doubly Linked List</span>
        <span class="ans-chip">O(1) get/put</span>
        <span class="ans-chip">Design</span>
      </div>

      <h3>Overview</h3>
      <p>Design a Least-Recently-Used cache with O(1) <code>get</code> and <code>put</code>. The standard solution combines a <strong>HashMap</strong> (key → node, for O(1) lookup) with a <strong>doubly linked list</strong> (maintains usage order; move-to-front on access, evict from the back).</p>

      <h3>Why Both Structures</h3>
      <ul>
        <li><strong>HashMap</strong> alone can't track recency order in O(1).</li>
        <li><strong>Doubly linked list</strong> alone can't locate a key in O(1).</li>
        <li>Together: map finds the node, the DLL reorders/evicts in O(1) (a node knows its neighbors).</li>
      </ul>

      <h3>Java Code (Optimal)</h3>
      <pre class="code-block">class LRUCache {
    private static class Node {
        int key, val; Node prev, next;
        Node(int k, int v) { key = k; val = v; }
    }
    private final int capacity;
    private final Map&lt;Integer, Node&gt; map = new HashMap&lt;&gt;();
    private final Node head = new Node(0, 0); <span class="cc">// dummy MRU end</span>
    private final Node tail = new Node(0, 0); <span class="cc">// dummy LRU end</span>

    public LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail; tail.prev = head;
    }
    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        Node node = map.get(key);
        remove(node); insertFront(node);     <span class="cc">// mark most-recently-used</span>
        return node.val;
    }
    public void put(int key, int value) {
        if (map.containsKey(key)) remove(map.get(key));
        Node node = new Node(key, value);
        map.put(key, node);
        insertFront(node);
        if (map.size() &gt; capacity) {          <span class="cc">// evict LRU</span>
            Node lru = tail.prev;
            remove(lru);
            map.remove(lru.key);
        }
    }
    private void remove(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void insertFront(Node n) {
        n.next = head.next; n.prev = head;
        head.next.prev = n; head.next = n;
    }
}</pre>
      <p>Dummy <code>head</code>/<code>tail</code> sentinels remove null checks when inserting/removing at the ends.</p>

      <h3>Complexity Analysis</h3>
      <table><thead><tr><th>Operation</th><th>Time</th><th>Space</th></tr></thead>
      <tbody><tr><td>get / put</td><td><span class="ans-cx">O(1)</span></td><td><span class="ans-cx">O(capacity)</span></td></tr></tbody></table>

      <h3>Dry Run</h3>
      <p>cap 2: put(1,1),put(2,2),get(1)→1 (1 now MRU),put(3,3) evicts 2,get(2)→−1 ✓</p>

      <div class="ans-callout tip"><span class="ans-callout-label">Shortcut</span>Java's <code>LinkedHashMap</code> with <code>accessOrder=true</code> and an overridden <code>removeEldestEntry</code> implements LRU in a few lines — but interviewers usually want the manual HashMap+DLL to prove you understand it.</div>
      <div class="ans-callout trap"><span class="ans-callout-label">Common mistakes</span>(1) Forgetting to move a node to front on <code>get</code>. (2) Not updating the map on eviction. (3) Null-pointer bugs at the ends — sentinels fix these.</div>

      <h3>Common Interview Questions</h3>
      <ul>
        <li><strong>LFU Cache (LC 460)?</strong> Adds frequency buckets — harder; combine maps of frequency → DLL.</li>
        <li><strong>Thread-safe LRU?</strong> Wrap with locks or use <code>ConcurrentHashMap</code> + striped locking.</li>
      </ul>

      <h3>Key Takeaways</h3>
      <ul><li>HashMap for O(1) lookup + doubly linked list for O(1) recency ordering.</li><li>Move-to-front on access; evict from the tail; use sentinels.</li></ul>`
  }

});
