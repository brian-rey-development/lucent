# Series bible · Reading the genome

The biology and data behind a genetic diagnosis, for a software engineer who knows no biology.
Every episode is a narrated, animated video built from `episodes/<id>/script.md`.
Episode 1 (`ep01_where_the_instructions_live/script.md`) is the reference for tone, density and format.

## The promise

By the last episode the viewer can read a real variant file line by line, and understands why
finding the one line that explains a child's disease is hard. Nothing is assumed. Every concept is
built from something already shown.

## Episodes

| # | Folder | Title | Core question | Ends by teasing |
|---|---|---|---|---|
| 1 | ep01_where_the_instructions_live | Where the instructions live | What is DNA and where is it? | "Why believe it?" 1944 |
| 2 | ep02_how_we_know | How we know | How was DNA proven to be the instructions, and why does A pair with T? | Strands have a direction |
| 3 | ep03_direction | Direction and the reverse complement | Why must you reverse as well as complement? | How a string becomes a body |
| 4 | ep04_genes | Genes: the code that runs | How does a stretch of DNA become a protein? | What if one letter changes? |
| 5 | ep05_one_letter | When one letter changes | What kinds of changes exist, and why do some matter? | We carry two copies |
| 6 | ep06_two_copies | Two copies | How do inheritance patterns decide whether a change causes disease? | How does a lab actually read DNA? |
| 7 | ep07_reading_machine | Reading DNA with a machine | How does a blood sample become data, and where does uncertainty come from? | Where exactly is a variant? |
| 8 | ep08_coordinates | Coordinates and their traps | How do we say where a variant is, and how does that silently go wrong? | The file itself |
| 9 | ep09_the_vcf | The VCF, line by line | What does every field in the file mean? | From 25,000 lines to one |
| 10 | ep10_twenty_five_thousand_to_one | From 25,000 to one | How do we find Maya's line, and prove it? | What Halden builds |

### Content per episode

**2 · How we know.** Griffith 1928 (smooth and rough pneumococcus, mice, heat-killed smooth plus live rough kills). Avery, MacLeod and McCarty 1944 (destroy protein or RNA and transformation still happens; destroy DNA and it stops). Hershey and Chase 1952, briefly (phage: labelled DNA enters the bacterium, labelled protein stays outside). Chargaff's measurements (A about equal to T, G about equal to C in every species, with the human numbers A 30.9, T 29.4, G 19.9, C 19.8): ask the viewer to guess why before revealing. X-ray diffraction evidence for a helix (Franklin and Gosling, 1952; do NOT show Photo 51, it is not freely licensed: animate an X-shaped diffraction pattern instead). Watson and Crick 1953: pairing as geometry (a large base with a small one keeps the ladder the same width; A-T two hydrogen bonds, G-C three). Consequence: one strand determines the other, so DNA can be copied (semi-conservative replication, Meselson and Stahl 1958 in one line) and repaired. Predict-the-other-strand exercise.

**3 · Direction.** The backbone: sugar and phosphate; carbons numbered 1′ to 5′, so each strand has a 5′ end and a 3′ end. Antiparallel strands, like two lanes of a highway. Convention: sequences are written 5′ to 3′. Reverse complement worked by hand, then as the operation Halden will code (`reverse_complement`). Hook: GAATTC equals its own reverse complement (the EcoRI site), so some sequences read the same on both strands. The reference genome is written along one strand (the plus strand); genes can sit on either. Plant the seed: HBB lies on the minus strand (payoff in episode 8).

**4 · Genes.** What proteins do (enzymes, structure, signals, hemoglobin carrying oxygen). Central dogma as repository, checkout, compile: DNA, transcription to RNA (U instead of T), translation by the ribosome. Exons and introns, splicing, splice sites. The exome is about 1 to 2 percent of the genome and holds most known disease variants. Codons: why three letters (4 squared is 16, fewer than 20 amino acids; 4 cubed is 64, enough, hence redundancy). Start ATG, stops TAA TAG TGA. The reading frame. Worked example: HBB begins ATG GTG CAT CTG ACT CCT GAG GAG, which reads M V H L T P E E. (This is the sequence printed under the helix in episode 1: pay it off.)

**5 · One letter.** Variant types on HBB: synonymous, missense, stop-gained (nonsense) with nonsense-mediated decay, frameshift, in-frame insertion or deletion, splice-site. Sickle cell in depth: codon 7 GAG to GTG, glutamate to valine, hydrophobic patch, polymerisation at low oxygen, rigid sickled cells blocking vessels. Why it is common: carriers are protected against severe malaria. HGVS notation: c.20A>T and p.Glu7Val, and the historical E6V name (initial methionine not counted). Same variant, two names: a data problem in a biology costume.

**6 · Two copies.** Heterozygous and homozygous. Dominant (one broken copy is enough: too little protein, or a faulty protein that sabotages the good one). Recessive (carriers are healthy; sickle cell trait versus disease). X-linked, briefly. De novo variants: new in the child, absent in both parents, a major cause of severe childhood conditions like Maya's; this is why labs sequence a trio. Compound heterozygous: two different broken variants, one from each parent; needs phase. Punnett square for two carrier parents: 25 percent per pregnancy, independently each time (probability has no memory).

**7 · Reading machine.** Fragment, capture (exome baits, uneven coverage), read (about 150 letters per read, sequencing by synthesis with fluorescent bases, clusters on a flow cell), quality scores (Phred: Q30 means 1 error in 1,000). Alignment as search: tens of millions of 150-letter strings located in a 3.1-billion-letter text, tolerating mismatches; intuition of an index, name the Burrows-Wheeler transform without deriving it. Pileup. Depth, allele fraction (heterozygous about 50 percent, never exactly: coin flips, binomial noise), genotype quality. Low depth makes calls flip on identical DNA. GC-rich regions sequence unevenly (callback to episode 2's three bonds).

**8 · Coordinates.** The reference genome is a ruler, a mosaic from a few anonymous donors, not a healthy human. Builds: GRCh37 (2009, hg19) and GRCh38 (2013, hg38); sickle variant at chr11:5,248,232 on GRCh37 and chr11:5,227,002 on GRCh38; mixing builds crashes nothing and silently compares wrong positions. Off-by-one: VCF is 1-based, BED and Python slices are 0-based half-open. Strand payoff: HBB is on the minus strand, so the coding change A>T is written T>A in the VCF. Normalization: CAGCAGCAG losing one CAG can be written three ways; left-align and trim; split multiallelic sites; otherwise joins against ClinVar silently fail. Naming: chr11 versus 11, chrM versus MT.

**9 · The VCF.** Meta-information lines (`##fileformat`, `##reference`, `##contig`, `##INFO`, `##FORMAT`), the header line, then one line per site. Columns CHROM POS ID REF ALT QUAL FILTER INFO FORMAT and the sample column. Walk the real sickle line (rs334, chr11 5227002 T A) field by field. Genotypes: 0/0, 0/1, 1/1, 1/2, phased `|`. AD, DP, GQ tied back to episode 7. Multiallelic rows. Compression and indexing (bgzip, tabix) so a 3-billion-coordinate file can be queried by region.

**10 · 25,000 to one.** Annotation: VEP computes consequence, gene, transcript and HGVS for each variant. gnomAD: frequency across hundreds of thousands of people; the arithmetic of why a variant carried by 1 in 50 cannot cause a dominant disease that affects 1 in 100,000 children. ClinVar: past lab conclusions with review stars, versioned, sometimes reclassified. Gene constraint: genes almost never broken in healthy people. HPO: Maya's symptoms as ontology terms matched against what each gene is known to cause. Hard filters versus ranking (every filter can silently discard the answer). Resolution: Maya's highlighted line from episode 1 (chr2 166011234 C>T) falls in SCN1A; de novo, absent from gnomAD, a damaging change in a highly constrained gene, phenotype matching Dravet syndrome (fever-sensitive seizures from infancy, developmental delay). Why the answer matters: in Dravet syndrome some common anti-seizure drugs (sodium channel blockers) can make seizures worse. State honestly that this exact line is invented for the story and the pattern is real. Close the series and name what Halden builds.

## Running threads

- **Maya** (invented, stated as such in episode 1): four years old, seizures since age one, walked and spoke late, three specialists, no diagnosis. Her file has about 25,000 lines. Her highlighted line is `chr2 166011234 C T 0/1`. Revisit her briefly in most episodes (why her parents' DNA matters in 6, why her blood gives DNA in 7, what her line means in 9 and 10). The gene is revealed only in episode 10.
- **HBB and sickle cell**: the worked example for genes (4), variants (5), inheritance (6), coordinates and strand (8) and the VCF (9).
- **Colour always means the same thing**: A green `#1B9E77`, C blue `#2C6FB7`, G orange `#D98B1C`, T red `#C8463D`, DNA cyan, mother red, father blue.

## Script format (must match episode 1 exactly; the renderer parses it)

```
# Episode N · Title

Format paragraph (copy from episode 1).

## segment-id
Visual: One paragraph: what is on screen, concrete enough to animate in Manim or to place a real photo.
- EN: One spoken sentence or two short ones.
  ES: Its Spanish subtitle.
- PAUSE: 2.5
```

- Segment ids are lowercase with hyphens. Every `- EN:` line is followed by a two-space-indented `ES:` line.
- 1,100 to 1,500 spoken English words per episode (about 8 to 10 minutes), 8 to 14 segments.
- End the file with an HTML comment holding **Fact notes** (every checkable claim with its source) and
  **Image candidates** (Wikimedia Commons file title, license, resolution, and what the file description
  says it actually shows).

## Voice and writing rules

- Written for the ear. Short sentences. One idea per sentence. The narrator is an expert teacher who
  respects the viewer: no hype, no filler, no "fascinating", "journey", "delve", "tapestry", "in this video".
- Story and stakes before facts. A question before every answer. At least one predict-then-reveal moment.
  At least one "how do we know" moment with the actual evidence.
- Analogies must be accurate and say where they break.
- Text-to-speech friendly EN lines: spell numbers the way they are spoken ("twenty-five thousand",
  "nineteen forty-four"), write units in words ("microns", "five prime"), no symbols, no abbreviations
  that a speech engine could misread. Symbols like µm, 5′ or p.Glu7Val belong in `Visual:`, not in `EN:`.
- ES subtitles: natural Rioplatense Spanish with voseo ("fijate", "pensá"), matching episode 1; numbers
  may use digits.
- Never use em dashes in any language. Use commas, colons or full stops.
- Visuals: real licensed photos for what is real, animation for mechanisms. Continuity over cuts: say how
  one shape turns into the next. Minimal on-screen text.
- Accuracy over drama. If a number is approximate, say "about". If something is simplified, say so.
