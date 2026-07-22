import * as fs from 'fs/promises';
import {
  AlignmentType,
  UnderlineType,
  LevelFormat,
  convertInchesToTwip,
  Paragraph,
  TextRun,
  PageBreak,
  ExternalHyperlink
} from 'docx';

// The styles.xml is extracted from the ISO .dotx template
// (just rename the file to .zip, and get it from under the "word" folder)
const styles = await fs.readFile('./styles.xml', 'utf-8');


/**
 * Create a new set of parameters that can be used to create an appropriate
 * .docx document.
 *
 * Two main sections:
 * - The preamble content includes the table of contents and the introduction.
 * - The main content starts with the spec title.
 */
export function createDocxParameters({ title, commits }) {
  return {
    externalStyles: styles,
    styles: {
      characterStyles: [
        {
          id: 'CodeInline',
          name: 'Code (inline)',
          basedOn: 'DefaultParagraphFont',
          run: {
            font: 'Courier New',
            size: 18
          }
        },
        {
          id: 'CodeHyperlink',
          name: 'Code with hyperlink',
          basedOn: 'DefaultParagraphFont',
          run: {
            font: 'Courier New',
            size: 18,
            color: '#0000FF',
            underline: {
              type: UnderlineType.SINGLE
            }
          }
        }
      ]
    },

    sections: [
      {
        children: [
          new Paragraph({
            text: 'Foreword',
            style: 'Foreword Title'
          }),
          new Paragraph({
            text: 'ISO (the International Organization for Standardization) is a worldwide federation of national standards bodies (ISO member bodies). The work of preparing International Standards is normally carried out through ISO technical committees. Each member body interested in a subject for which a technical committee has been established has the right to be represented on that committee. International organizations, governmental and non-governmental, in liaison with ISO, also take part in the work. ISO collaborates closely with the International Electrotechnical Commission (IEC) on all matters of electrotechnical standardization.',
            style: 'Foreword Text'
          }),
          new Paragraph({
            children: [
              new TextRun('The procedures used to develop this document and those intended for its further maintenance are described in the ISO/IEC Directives, Part 1. In particular, the different approval criteria needed for the different types of ISO documents should be noted. This document was drafted in accordance with the editorial rules of the ISO/IEC Directives, Part 2 (see '),
              new ExternalHyperlink({
                children: [new TextRun({
                  text: 'www.iso.org/directives',
                  style: 'Hyperlink'
                })],
                link: 'https://www.iso.org/directives'
              }),
              new TextRun(').')
            ],
            style: 'Foreword Text'
          }),
          new Paragraph({
            children: [
              new TextRun('ISO draws attention to the possibility that the implementation of this document may involve the use of (a) patent(s). ISO takes no position concerning the evidence, validity or applicability of any claimed patent rights in respect thereof. As of the date of publication of this document, ISO had not received notice of (a) patent(s) which may be required to implement this document. However, implementers are cautioned that this may not represent the latest information, which may be obtained from the patent database available at '),
              new ExternalHyperlink({
                children: [new TextRun({
                  text: 'www.iso.org/patents',
                  style: 'Hyperlink'
                })],
                link: 'https://www.iso.org/patents'
              }),
              new TextRun('. ISO shall not be held responsible for identifying any or all such patent rights.')
            ],
            style: 'Foreword Text'
          }),
          new Paragraph({
            text: 'Any trade name used in this document is information given for the convenience of users and does not constitute an endorsement.',
            style: 'Foreword Text'
          }),
          new Paragraph({
            children: [
              new TextRun('For an explanation of the voluntary nature of standards, the meaning of ISO specific terms and expressions related to conformity assessment, as well as information about ISO\'s adherence to the World Trade Organization (WTO) principles in the Technical Barriers to Trade (TBT), see '),
              new ExternalHyperlink({
                children: [new TextRun({
                  text: 'www.iso.org/iso/foreword.html',
                  style: 'Hyperlink'
                })],
                link: 'https://www.iso.org/iso/foreword.html'
              }),
              new TextRun('.')
            ],
            style: 'Foreword Text'
          }),
          new Paragraph({
            children: [
              new TextRun(`This document was prepared by W3C (as ${title}) and drafted in accordance with its editorial rules. It was adopted, under the JTC 1 PAS procedure, by Joint Technical Committee ISO/IEC JTC 1, `),
              new TextRun({
                text: 'Information technology.',
                italics: true
              }),
              new TextRun('.')
            ],
            style: 'Foreword Text'
          }),
          new Paragraph('The main changes are as follows:'),
          new Paragraph({
            children: [
              new TextRun('—  see the full '),
              new ExternalHyperlink({
                children: [
                  new TextRun({
                    text: `commit history of ${title}`,
                    style: 'Hyperlink'
                  })
                ],
                link: commits
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun('Any feedback or questions on this document should be directed to the user’s national standards body. A complete listing of these bodies can be found at '),
              new ExternalHyperlink({
                children: [
                  new TextRun({
                    text: 'www.iso.org/members.html',
                    style: 'Hyperlink'
                  })
                ],
                link: 'https://www.iso.org/members.html'
              }),
              new TextRun('.'),
              new PageBreak()
            ]
          })
        ]
      },
      {
        children: []
      }
    ],
    /*
    numbering: {
      config: [
        {
          reference: 'ul',
          levels: [
            {
              level: 0,
              format: LevelFormat.Bullet,
              text: '•',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.5),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 1,
              format: LevelFormat.Bullet,
              text: '•',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.75),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 2,
              format: LevelFormat.Bullet,
              text: '•',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(1),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 3,
              format: LevelFormat.Bullet,
              text: '•',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(1.25),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 4,
              format: LevelFormat.Bullet,
              text: '•',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(1.5),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 5,
              format: LevelFormat.Bullet,
              text: '•',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(1.75),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 6,
              format: LevelFormat.Bullet,
              text: '•',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(2),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 7,
              format: LevelFormat.Bullet,
              text: '•',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(2.25),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 8,
              format: LevelFormat.Bullet,
              text: '•',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(2.5),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            }
          ]
        },
        {
          reference: 'ol',
          levels: [
            {
              level: 0,
              format: LevelFormat.Decimal,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.5),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 1,
              format: LevelFormat.Decimal,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.75),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 2,
              format: LevelFormat.Decimal,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(1),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 3,
              format: LevelFormat.Decimal,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(1.25),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 4,
              format: LevelFormat.Decimal,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(1.5),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 5,
              format: LevelFormat.Decimal,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(1.75),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 6,
              format: LevelFormat.Decimal,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(2),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 7,
              format: LevelFormat.Decimal,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(2.25),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            },
            {
              level: 8,
              format: LevelFormat.Decimal,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(2.5),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            }
          ]
        }
      ]
    }*/
  };
}