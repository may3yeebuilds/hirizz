export async function readResumeFile(file, extractor = globalThis.mammoth) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose a resume file of 5 MB or less.');
  const extension = file.name.split('.').pop().toLowerCase();
  if (extension === 'doc') throw new Error('This is an older Word .doc file. Open it in Word and save a .docx copy, then upload that copy.');
  if (!['txt', 'docx'].includes(extension)) throw new Error('Choose a Word (.docx) or text (.txt) file.');
  let text;
  if (extension === 'txt') text = await file.text();
  else {
    if (!extractor?.extractRawText) throw new Error('The Word importer could not load. Refresh the page and try again.');
    try {
      const result = await extractor.extractRawText({arrayBuffer: await file.arrayBuffer()});
      text = result.value;
    } catch {
      throw new Error('Could not read this Word document. It may be damaged, password-protected, or not a valid .docx file. Try saving a new .docx copy in Word.');
    }
  }
  if (!text?.trim()) throw new Error('No readable text was found. If your resume contains scanned images, paste its text instead.');
  return text.replace(/\r\n?/g, '\n').trim();
}
