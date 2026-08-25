type Language = 'en' | 'bn';

export function attachmentCopy(language: Language) {
  const bn = language === 'bn';
  return {
    title: bn ? 'ডকুমেন্ট ও ফাইল' : 'Documents & files', subtitle: bn ? 'ছবি, ভিডিও, PDF এবং যেকোনো ফাইল স্থানীয়ভাবে রাখুন।' : 'Keep images, videos, PDFs and any file locally.', add: bn ? 'ফাইল যোগ' : 'Add files', addLabel: bn ? 'ফাইল যোগ করুন' : 'Add files',
    loadError: bn ? 'ফাইলগুলো লোড করা যায়নি' : 'Unable to load attachments', addError: bn ? 'ফাইল যোগ করা যায়নি' : 'Unable to add files', removeError: bn ? 'ফাইলটি মুছে ফেলা যায়নি' : 'Unable to remove file', openError: bn ? 'ফাইল খোলা যায়নি' : 'Unable to open file', shareError: bn ? 'ফাইল শেয়ার করা যায়নি' : 'Unable to share file',
    added:(count:number)=>bn?`${count}টি ফাইল যোগ হয়েছে`:`${count} file(s) added`, removed:bn?'ফাইল মুছে ফেলা হয়েছে':'File removed', problem:bn?'ফাইল সমস্যা':'File problem', retry:bn?'আবার চেষ্টা':'Retry', noFiles:bn?'এখনও কোনো ফাইল নেই':'No files yet', empty:bn?'ফাইল যোগ করুন; এটি এই ডিভাইসেই সংরক্ষিত থাকবে।':'Add files; they are stored on this device.',
    open:bn?'খুলুন':'Open', share:bn?'শেয়ার':'Share', remove:bn?'মুছুন':'Remove', closePreview:bn?'প্রিভিউ বন্ধ করুন':'Close preview', removeTitle:bn?'ফাইল মুছবেন?':'Remove file?', confirmRemove:bn?'মুছুন':'Remove', cancel:bn?'বাতিল':'Cancel',
    typeLabel:(mime:string)=>mime.startsWith('image/')?(bn?'ছবি':'Image'):mime.startsWith('video/')?(bn?'ভিডিও':'Video'):mime.startsWith('audio/')?(bn?'অডিও':'Audio'):mime.includes('pdf')?'PDF':bn?'ডকুমেন্ট':'Document', sizeUnknown:bn?'আকার অজানা':'Size unknown', duration:(value:string)=>bn?`সময় ${value}`:`Duration ${value}`,
  };
}
