import { taxSkills } from './tax-skills';
import { financeSkills } from './finance-skills';
import { mathSkills } from './math-skills';
import { excelSkills } from './excel-skills';
import { officeSkills } from './office-skills';
import { arduinoSkills } from './arduino-skills';
import { clipboardSkills } from './clipboard';
import { workspaceSkills } from './workspace';
import { webSkills } from './web';

/**
 * Semua skill tool. Daftarkan ke streamText({ tools: skillTools }) di route chat.
 * Skill excel dan workspace hanya berjalan di server (Node.js runtime).
 */
export const skillTools = {
  ...taxSkills,
  ...financeSkills,
  ...mathSkills,
  ...excelSkills,
  ...officeSkills,
  ...arduinoSkills,
  ...clipboardSkills,
  ...workspaceSkills,
  ...webSkills,
};
