import * as fs from 'fs/promises';
import {
  AlignmentType,
  UnderlineType,
  LevelFormat,
  convertInchesToTwip
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
export function createDocxParameters() {
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
        children: []
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