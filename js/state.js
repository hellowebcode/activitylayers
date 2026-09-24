/* Der gemeinsame Zustand. Alles hier entsteht aus der geladenen Datei und wird
   von den Rechnungen, der Vorschau und allen Generatoren gelesen. */

// ghostPoints ist die Geisterspur: eine zweite Aufzeichnung, von der nur der
// Streckenverlauf uebrigbleibt.
var ghostPoints=[], ghostFilename='';

var rawPoints=[], speedData=[], hrData=[], cadData=[], powerData=[], tempData=[], paceData=[], gradeData=[], distData=[], lapData=[], totalDistM=0, currentFilename='';
